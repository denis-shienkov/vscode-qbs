import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsSdccDiagnosticParser extends QbsDiagnosticParser {
    private readonly сompilerRegexp1 = /^(?<fsPath>.+\.\S+):(?<line>\d+)?:(?<column>\d+):\s(?<severity>warning|error|syntax error|fatal error):\s(?<details>.+)$/;
    private readonly сompilerRegexp2 = /^(?<fsPath>.+\.\S+):(?<line>\d+):\s(?<severity>warning|error|syntax error|fatal error)\s*(?<code>\d+)?:\s(?<details>.+)$/;
    private readonly asLinkerRegexp = /^\?ASlink-(?<severity>Warning|Error)-(?<details>.+)$/;

    public constructor() { super(QbsToolchain.Sdcc); }

    protected parseLine(line: string): void {
        if (this.parseCompilerMessages(line))
            return;
        else if (this.parseAsLinkerMessages(line))
            return;
    }

    private parseCompilerMessages(line: string): boolean {
        {
            const matches = this.сompilerRegexp1.exec(line);
            if (matches) {
                const [, fsPath, linestr, columnstr, severity, message] = matches;
                const lineNo = substractOne(linestr);
                const columnNo = substractOne(columnstr);
                const range = new vscode.Range(lineNo, columnNo, lineNo, columnNo);
                const diagnostic: vscode.Diagnostic = {
                    source: this.toolchainType,
                    severity: QbsSdccDiagnosticParser.encodeSeverity(severity),
                    message,
                    range
                };
                this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
                return true;
            }
        }

        {
            const matches = this.сompilerRegexp2.exec(line);
            if (matches) {
                const [, fsPath, linestr, severity, code, message] = matches;
                const lineNo = substractOne(linestr);
                const range = new vscode.Range(lineNo, 0, lineNo, 999);
                const diagnostic: vscode.Diagnostic = {
                    source: this.toolchainType,
                    severity: QbsSdccDiagnosticParser.encodeSeverity(severity),
                    message,
                    range,
                    code
                };
                this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
                return true;
            }
        }

        return false;
    }

    private parseAsLinkerMessages(line: string): boolean {
        const matches = this.asLinkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, message] = matches;
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsSdccDiagnosticParser.encodeSeverity(severity),
            message,
            range
        };
        // FIXME: How to use diagnostic without of a file path?
        // Related issue: https://github.com/microsoft/vscode/issues/112145
        this.insertDiagnostic(vscode.Uri.file(''), diagnostic);
        return true;
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
            case QbsDiagnosticParserSeverity.Error:
            case QbsDiagnosticParserSeverity.FatalError:
            case QbsDiagnosticParserSeverity.SyntaxError:
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
}
