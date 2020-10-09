import * as vscode from 'vscode';

export class QbsSessionLogger implements vscode.Disposable {
    // Private members.
    private _compileOutput: vscode.OutputChannel;

    // Constructors.

    constructor(readonly extensionContext: vscode.ExtensionContext) {
        this._compileOutput = vscode.window.createOutputChannel('QBS');
    }

    // Public overriden methods.

    dispose() {  }
}