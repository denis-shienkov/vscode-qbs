import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsIarDiagnosticParser extends QbsDiagnosticParser {
    private diagnostic?: vscode.Diagnostic;
    private fsPath?: string;
    private readonly compilerRegexp = /^"(.+\.\S+)",(\d+)\s+(Fatal error|Error|Warning)\[(\S+)\]:\s*$/;
    private readonly assemblerRegext = /^"(.+\.\S+)",(\d+)\s+(Error|Warning)\[(\d+)\]:\s(.+)$/;

    public constructor() { super(QbsToolchain.Iar); }

    protected parseLine(line: string): void {
        if (this.parseCompilerMessage(line))
            return;
        else if (this.parseAssemblerMessage(line))
            return;
    }

    private parseFirstMessagePart(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, file, linestr, severity, code, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };
        this.diagnostic = diagnostic;
        this.fsPath = file;
        return true;
    }

    private parseLastMessagePart(line: string): boolean {
        const matches = /^\s+(.+)$/.exec(line);
        if (!matches || !this.diagnostic)
            return false;
        this.diagnostic.message = matches[1];
        return true;
    }

    private parseCompilerMessage(line: string): boolean {
        if (!this.diagnostic) {
            if (this.parseFirstMessagePart(line))
                return true;
        } else if (this.fsPath) {
            if (this.parseLastMessagePart(line))
                this.insertDiagnostic(vscode.Uri.file(this.fsPath), this.diagnostic);
            this.diagnostic = undefined;
            this.fsPath = undefined;
            return true;
        }
        return false;
    }

    private parseAssemblerMessage(line: string): boolean {
        const matches = this.assemblerRegext.exec(line);
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
