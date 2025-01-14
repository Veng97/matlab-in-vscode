// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    function findMatlabTerminal() {
        let matlabTerminalId = context.workspaceState.get('matlabTerminalId');
        if (matlabTerminalId !== undefined) {
            return vscode.window.terminals.find(x => x.processId === matlabTerminalId);
        }
        else {
            return undefined;
        }
    }

    function sendToMatlab(command: string) {
        let matlabTerminal = findMatlabTerminal();
        if (matlabTerminal !== undefined) {
            matlabTerminal.sendText(command);
        }
        else {
            matlabTerminal = startMatlab();
            // matlabTerminal.sendText(command);
        }
    }

    function startMatlab() {
        let matlabTerminal = findMatlabTerminal();
        if (matlabTerminal === undefined) {
            matlabTerminal = vscode.window.createTerminal('Matlab');
            context.workspaceState.update('matlabTerminalId', matlabTerminal.processId);

            let config = vscode.workspace.getConfiguration('matlab-in-vscode');
            let matlabPybackend = config.get('matlabPybackend') as boolean;
            let command = "";
            if (matlabPybackend) {
                let scriptPath = path.join(context.asAbsolutePath(""), "/pybackend/matlab_engine.py");
                // matlabTerminal.sendText('python ' + scriptPath, true);
                command += 'python ' + scriptPath + '\n';
            }
            else {
                let matlabCMD = config.get('matlabCMD') as string;
                // matlabTerminal.sendText(matlabCMD, true);
                command += matlabCMD + '\n';
            }

            let matlabStartup = config.get('matlabStartup') as string;
            for (let i = 0; i < matlabStartup.length; i++) {
                // matlabTerminal.sendText(matlabStartup[i], true);
                command += matlabStartup[i] + '\n';
            }
            matlabTerminal.sendText(command);
        }
        matlabTerminal.show(true);
        return matlabTerminal;
    }

    function runMatlabCell() {
        let activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
            let code = activeTextEditor.document.getText();
            let activeLine = activeTextEditor.document.lineAt(activeTextEditor.selection.active).lineNumber;
            let lines = code.split("\n");
            let codeToRun = '';

            // find the cell that contains the current line
            let cellStart = activeLine;
            while (cellStart > 0) {
                if (lines[cellStart].startsWith('%%')) {
                    break;
                }
                cellStart--;
            }
            let cellEnd = activeLine;
            while (cellEnd < lines.length) {
                if (lines[cellEnd].startsWith('%%')) {
                    break;
                }
                cellEnd++;
            }
            codeToRun = lines.slice(cellStart, cellEnd).join('\n');
            sendToMatlab(codeToRun);
        }
    }

    function runMatlabFile() {
        let filePath = vscode.window.activeTextEditor?.document.fileName;
        if (filePath !== undefined) {
            let matlabCommand = `run('${filePath}')`;
            sendToMatlab(matlabCommand);
        }
    }

    function cdFileDirectory() {
        let filePath = vscode.window.activeTextEditor?.document.fileName;
        if (filePath !== undefined) {
            let matlabCommand = `cd('${path.dirname(filePath)}')`;
            sendToMatlab(matlabCommand);
        }
    }

    function interupt() {
        let matlabTerminal = findMatlabTerminal();
        if (matlabTerminal !== undefined) {
            // send ctrl+c
            matlabTerminal.sendText(String.fromCharCode(3));
        }
    }

    function stopMatlab() {
        let matlabTerminal = findMatlabTerminal();
        if (matlabTerminal !== undefined) {
            matlabTerminal.dispose();
            context.workspaceState.update('matlabTerminalId', undefined);
        }
    }

    function showVariable() {
        let command = 'workspace';
        sendToMatlab(command);
    }

    function editInMatlab() {
        let filePath = vscode.window.activeTextEditor?.document.fileName;
        if (filePath !== undefined) {
            let command = `edit('${filePath}')`;
            sendToMatlab(command);
        }
    }

    function showMatlabDoc() {
        let command = 'doc';
        sendToMatlab(command);
    }

    let dispRunMatlabFile = vscode.commands.registerCommand("matlab-in-vscode.runMatlabFile", () => {
        runMatlabFile();
    });
    let dispRunMatlabCell = vscode.commands.registerCommand("matlab-in-vscode.runMatlabCell", () => {
        runMatlabCell();
    });
    let dispInteruptMatlab = vscode.commands.registerCommand("matlab-in-vscode.interupt", () => {
        interupt();
    });
    let dispStopMatlab = vscode.commands.registerCommand("matlab-in-vscode.stop", () => {
        stopMatlab();
    });
    let dispCdFileDirectory = vscode.commands.registerCommand("matlab-in-vscode.cd", () => {
        cdFileDirectory();
    });
    let dispShowVariable = vscode.commands.registerCommand("matlab-in-vscode.variable", () => {
        showVariable();
    });
    let dispEditInMatlab = vscode.commands.registerCommand("matlab-in-vscode.edit", () => {
        editInMatlab();
    });
    let dispShowMatlabDoc = vscode.commands.registerCommand("matlab-in-vscode.doc", () => {
        showMatlabDoc();
    });

    context.subscriptions.push(dispInteruptMatlab);
    context.subscriptions.push(dispRunMatlabCell);
    context.subscriptions.push(dispRunMatlabFile);
    context.subscriptions.push(dispStopMatlab);
    context.subscriptions.push(dispCdFileDirectory);
    context.subscriptions.push(dispShowVariable);
    context.subscriptions.push(dispEditInMatlab);
    context.subscriptions.push(dispShowMatlabDoc);

    let activeEditor = vscode.window.activeTextEditor;
    let timeout: NodeJS.Timer | undefined = undefined;
    const splitLine = vscode.window.createTextEditorDecorationType({
        // border on bottom
        borderStyle: 'solid',
        // use theme color foreground
        borderColor: new vscode.ThemeColor('editorLineNumber.foreground'),
        borderWidth: '1px 0 0 0',
        isWholeLine: true,
    });

    function updateDecorations() {
        if (activeEditor) {
            let code = activeEditor.document.getText();
            let lines = code.split("\n");
            let decorations = [];
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('%%')) {
                    let decoration = {
                        range: new vscode.Range(i, 0, i, lines[i].length)
                    };
                    decorations.push(decoration);
                }
            }
            activeEditor.setDecorations(splitLine, decorations);
        }
    }

    function triggerUpdateDecorations(throttle = false) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        if (throttle) {
            timeout = setTimeout(updateDecorations, 500);
        } else {
            updateDecorations();
        }
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations(true);
        }
    }, null, context.subscriptions);

    updateDecorations();
}

// This method is called when your extension is deactivated
export function deactivate() {

}
