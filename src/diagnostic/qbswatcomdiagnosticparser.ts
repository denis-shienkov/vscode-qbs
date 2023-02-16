import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsWatcomDiagnosticParser extends QbsDiagnosticParser {
    private readonly compilerRegexp = /^(?<file>.+)\((?<line>\d+)\):\s(?<severity>Error|Warning|Note)!\s(?<code>\w{1}\d+):\s(?<details>.+)$/;
    private readonly linkerRegexp = /^(?<severity>Error|Warning|Note)!\s(?<code>\w{1}\d+):\s(?<details>.+)$/;
    private readonly detailLinkerRegexp = /^(file\s.+)$/;

    public constructor() { super(QbsToolchain.Watcom); }

    protected parseLine(line: string): void {
        if (this.parseCompilerMessage(line))
            return;
        else if (this.parseLinkerMessage(line))
            return;
        else if (this.parseDetailLinkerMessage(line))
            return;
    }

    private parseCompilerMessage(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, severity, code, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsWatcomDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseLinkerMessage(line: string): boolean {
        const matches = this.linkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, code, message] = matches;
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsWatcomDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(''), diagnostic);
        return true;
    }

    private parseDetailLinkerMessage(line: string): boolean {
        const matches = this.detailLinkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, message] = matches;
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: vscode.DiagnosticSeverity.Error,
            message,
            range
        };

        this.insertDiagnostic(vscode.Uri.file(''), diagnostic);
        return true;
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
            case QbsDiagnosticParserSeverity.Error:
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
}
