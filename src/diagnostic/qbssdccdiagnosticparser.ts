import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsSdccDiagnosticParser extends QbsDiagnosticParser {
    private readonly compilerRegexp = /^(.+\.\S+):(\d+):\s(warning|error|syntax error|fatal error)\s*(\d+)?:\s(.+)$/;

    public constructor() { super(QbsToolchain.Sdcc); }

    protected parseLine(line: string): void {
        if (this.parseCompilerWarningsOrErrors(line))
            return;
    }

    private parseCompilerWarningsOrErrors(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

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
