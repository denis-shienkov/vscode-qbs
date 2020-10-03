// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "qbs-tools" is now active!');

    let configureCommand = vscode.commands.registerCommand('qbs.configure', () => {
        // Display a message box to the user
        vscode.window.showInformationMessage('QBS: configure');
    });
    context.subscriptions.push(configureCommand);

    let buildCommand = vscode.commands.registerCommand('qbs.build', () => {
        // Display a message box to the user
        vscode.window.showInformationMessage('QBS: build');
    });
    context.subscriptions.push(buildCommand);

    let cleanCommand = vscode.commands.registerCommand('qbs.clean', () => {
        // Display a message box to the user
        vscode.window.showInformationMessage('QBS: clean');
    });
    context.subscriptions.push(cleanCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
