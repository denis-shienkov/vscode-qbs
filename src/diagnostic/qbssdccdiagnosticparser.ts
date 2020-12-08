import * as vscode from 'vscode';
import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const REGEX = /^(.+\.\S+):(\d+):\s(warning|error|syntax error)\s(\d+):\s(.+)$/;

export class QbsSdccDiagnosticParser extends QbsDiagnosticParser {
    constructor(type: string) {
        super(type);
    }

    parseLines(lines: string[]) {
        for (const line of lines) {
            this.parseLine(line);
        }
    }

    private parseLine(line: string) {
        line = line.replace(/[\n\r]/g, '');

        const matches = REGEX.exec(line);
        if (!matches) {
            return;
        }

        const [, file, linestr, severity, code, message] = matches;
            const lineno = QbsDiagnosticUtils.substractOne(linestr);
            const range = new vscode.Range(lineno, 0, lineno, 999);

            const diagnostic: vscode.Diagnostic = {
                source: this.type(),
                severity: QbsSdccDiagnosticParser.encodeSeverity(severity),
                message,
                range,
                code
            };

            this.insertDiagnostic(file, diagnostic);
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        if (severity.toLowerCase() === 'error')
            return vscode.DiagnosticSeverity.Error;
        else if (severity.toLowerCase() === 'syntax error')
            return vscode.DiagnosticSeverity.Error;
        else if (severity.toLowerCase() === 'warning')
            return vscode.DiagnosticSeverity.Warning;
        return vscode.DiagnosticSeverity.Hint;
    }
}
