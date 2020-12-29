import * as vscode from 'vscode';

export function substractOne(num: number | string): number {
    return (typeof num === 'string')
        ? substractOne(parseInt(num))
        : Math.max(0, num - 1);
}

export abstract class QbsDiagnosticParser {
    private _diagnostics = new Map<string, vscode.Diagnostic[]>();

    constructor(private readonly _type: string) {}

    type(): string { return this._type; }

    cleanup() { this._diagnostics.clear(); }

    insertDiagnostic(filePath: string, diagnostic: vscode.Diagnostic) {
        if (!this._diagnostics.has(filePath)) {
            this._diagnostics.set(filePath, []);
        }
        this._diagnostics.get(filePath)!.push(diagnostic);
    }

    filePaths() { return this._diagnostics.keys(); }

    diagnosticsAt(filePath: string): ReadonlyArray<vscode.Diagnostic> {
        return this._diagnostics.get(filePath) || [];
    }

    abstract parseLines(lines: string[]): void;
}
