import { timeStamp } from 'console';
import * as vscode from 'vscode';

import { trimLine } from '../qbsutils';

export enum QbsDiagnosticParserSeverity {
    Error = 'error',
    FatalError = 'fatal error',
    Info = 'info',
    Note = 'note',
    Remark = 'remark',
    SyntaxError = 'syntax error',
    Warning = 'warning',
}

export abstract class QbsDiagnosticParser {
    private readonly diagnostics = new Map<vscode.Uri, vscode.Diagnostic[]>();

    public constructor(protected toolchainType: string) { }

    public parseLines(lines: string[]): void {
        lines.forEach(line => this.parseLine(trimLine(line)));
        this.parseLine(''); // Trigger fake last empty line.
    }

    public clearDiagnistics(): void { this.diagnostics.clear(); }

    public getDiagnostics() {
        const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [];
        for (let [key, value] of this.diagnostics)
            diagnostics.push([key, value]);
        return diagnostics;
    }

    protected insertDiagnostic(uri: vscode.Uri, diagnostic: vscode.Diagnostic) {
        if (!this.diagnostics.has(uri))
            this.diagnostics.set(uri, []);
        this.diagnostics.get(uri)!.push(diagnostic);
    }

    protected setToolchainType(toolchainType: string): void {
        this.toolchainType = toolchainType;
    }

    protected abstract parseLine(line: string): void;
}
