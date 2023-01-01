import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsMsvcDiagnosticParser extends QbsDiagnosticParser {
    private readonly compilerRegexp = /^\s*(\d+>)?\s*([^\s>].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\)\s*:\s+((?:fatal )?error|warning|info)\s+(\w{1,2}\d+)\s*:\s*(.*)$/;

    public constructor() { super(QbsToolchain.Msvc); }

    protected parseLine(line: string) {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return;

        const [, , fsPath, location, severity, code, message] = matches;
        const range = (() => {
            const parts = location.split(',');
            const n0 = substractOne(parts[0]);
            if (parts.length === 1) {
                return new vscode.Range(n0, 0, n0, 999);
            } else if (parts.length === 2) {
                const n1 = substractOne(parts[1]);
                return new vscode.Range(n0, n1, n0, n1);
            } else if (parts.length === 4) {
                const n1 = substractOne(parts[1]);
                const n2 = substractOne(parts[2]);
                const n3 = substractOne(parts[3]);
                return new vscode.Range(n0, n1, n2, n3);
            }
            throw new Error('Unable to determine location of MSVC diagnostic');
        })();

        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsMsvcDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
            case QbsDiagnosticParserSeverity.Error:
            case QbsDiagnosticParserSeverity.FatalError:
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            case QbsDiagnosticParserSeverity.Info:
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }
}
