import * as vscode from 'vscode';

export class QbsOutputLogger implements vscode.Disposable {
    private static instance: QbsOutputLogger;
    private output: vscode.OutputChannel = vscode.window.createOutputChannel('Qbs');

    public static getInstance(): QbsOutputLogger { return QbsOutputLogger.instance; }

    public constructor() {
        QbsOutputLogger.instance = this;
    }

    public dispose() { }
    public clearOutput() { this.output.clear(); }

    public logOutput(text: string) {
        this.output.show(true);
        this.output.appendLine(text);
    };
}
