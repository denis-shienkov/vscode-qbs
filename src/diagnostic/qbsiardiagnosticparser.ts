import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsIarDiagnosticParser extends QbsDiagnosticParser {
    private diagnostic?: vscode.Diagnostic;
    private fsPath: string = '';
    private readonly compilerRegexp = /^"(.+\.\S+)",(\d+)\s+(Fatal error|Error|Warning)\[(\S+)\]:\s*$/;
    private readonly assemblerRegexp = /^"(.+\.\S+)",(\d+)\s+(Error|Warning)\[(\d+)\]:\s(.+)$/;
    private readonly linkerRegexp = /^(Error)\[(\S+)\]:\s(.+)$/;

    public constructor() { super(QbsToolchain.Iar); }

    protected parseLine(line: string): void {
        if (this.parseCompilerMessage(line))
            return;
        else if (this.parseAssemblerMessage(line))
            return;
        else if (this.parseLinkerMessage(line))
            return;

        if (!this.parseDescription(line))
            this.commitDiagnostic();
    }

    private parseCompilerMessage(line: string): boolean {
        if (!this.diagnostic) {
            if (this.parseCompilerLocation(line))
                return true;
        }
        return false;
    }

    private parseAssemblerMessage(line: string): boolean {
        const matches = this.assemblerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, severity, code, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return false;
    }

    private parseLinkerMessage(line: string): boolean {
        if (!this.diagnostic) {
            if (this.parseLinkerLocation(line))
                return true;
        }
        return false;
    }

    private parseCompilerLocation(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, file, linestr, severity, code,] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message: '', // Will be available in the next line.
            range,
            code
        };
        this.diagnostic = diagnostic;
        this.fsPath = file;
        return true;
    }

    private parseLinkerLocation(line: string): boolean {
        const matches = this.linkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, code, message] = matches;
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };
        this.diagnostic = diagnostic;
        // FIXME: How to use diagnostic without of a file path?
        // Related issue: https://github.com/microsoft/vscode/issues/112145
        this.fsPath = '';
        return true;
    }

    private parseDescription(line: string): boolean {
        if (!this.diagnostic)
            return false;
        const matches = /^\s{10}(.+)$/.exec(line);
        if (!matches)
            return false;
        this.diagnostic.message += matches[1];
        return true;
    }

    private commitDiagnostic(): void {
        if (this.diagnostic) {
            this.insertDiagnostic(vscode.Uri.file(this.fsPath), this.diagnostic);
            this.diagnostic = undefined;
            this.fsPath = '';
        }
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
            case QbsDiagnosticParserSeverity.Error:
            case QbsDiagnosticParserSeverity.FatalError:
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
}
