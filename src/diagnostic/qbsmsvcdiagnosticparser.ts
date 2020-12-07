import * as vscode from 'vscode';
import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const REGEX = /^\s*(\d+>)?\s*([^\s>].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+((?:fatal )?error|warning|info)\s+(\w{1,2}\d+)\s*:\s*(.*)$/;

export class QbsMsvcDiagnosticParser extends QbsDiagnosticParser {
    constructor(type: string) {
        super(type);
    }

    parseLines(lines: string[]) {
        for (const line of lines) {
            this.parseLine(line);
        }
    }

    private parseLine(line: string) {
        const matches = REGEX.exec(line.replace(/[\n\r]/g, ''));
        if (matches) {
            const [full, proc, file, location, severity, code, message] = matches;
            const range = (() => {
                const parts = location.split(',');
                const n0 = QbsDiagnosticUtils.substractOne(parts[0]);
                if (parts.length === 1) {
                    return new vscode.Range(n0, 0, n0, 999);
                } else if (parts.length === 2) {
                    const n1 = QbsDiagnosticUtils.substractOne(parts[1]);
                    return new vscode.Range(n0, n1, n0, n1);
                } else if (parts.length === 4) {
                    const n1 = QbsDiagnosticUtils.substractOne(parts[1]);
                    const n2 = QbsDiagnosticUtils.substractOne(parts[2]);
                    const n3 = QbsDiagnosticUtils.substractOne(parts[3]);
                    return new vscode.Range(n0, n1, n2, n3);
                }
                throw new Error('Unable to determine location of MSVC diagnostic');
            })();

            const diagnostic: vscode.Diagnostic = {
                source: this.type(),
                message: message,
                range: range,
                severity: QbsMsvcDiagnosticParser.encodeSeverity(severity),
                code: code
            };

            this.insertDiagnostic(file, diagnostic);
        }
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        if (severity.toLowerCase() === 'error')
            return vscode.DiagnosticSeverity.Error;
        else if (severity.toLowerCase() === 'fatal')
            return vscode.DiagnosticSeverity.Error;
        else if (severity.toLowerCase() === 'warning')
            return vscode.DiagnosticSeverity.Warning;
        else if (severity.toLowerCase() === 'info')
            return vscode.DiagnosticSeverity.Information;
        return vscode.DiagnosticSeverity.Hint;
    }
}
