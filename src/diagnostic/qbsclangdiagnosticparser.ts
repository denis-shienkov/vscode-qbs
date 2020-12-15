import * as vscode from 'vscode';

import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import * as QbsUtils from '../qbsutils';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const REGEX = /^(.+\.\S+)\((\d+,\d+)\):\s(error|warning):\s(.+)/;

export class QbsClangDiagnosticParser extends QbsDiagnosticParser {
    constructor(type: string) {
        super(type);
    }

    parseLines(lines: string[]) {
        for (const line of lines) {
            this.parseLine(line);
        }
    }

    private parseLine(line: string) {
        const matches = REGEX.exec(QbsUtils.trimLine(line));
        if (!matches) {
            return;
        }

        const [, file, location, severity, message] = matches;
        const range = (() => {
            const parts = location.split(',');
            const n0 = QbsDiagnosticUtils.substractOne(parts[0]);
            if (parts.length === 2) {
                const n1 = QbsDiagnosticUtils.substractOne(parts[1]);
                return new vscode.Range(n0, n1, n0, n1);
            }
            throw new Error('Unable to determine location of Clang diagnostic');
        })();

        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsClangDiagnosticParser.encodeSeverity(severity),
            message,
            range
        };

        this.insertDiagnostic(file, diagnostic);
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        severity = severity.toLowerCase();
        if (severity === 'error')
            return vscode.DiagnosticSeverity.Error;
        else if (severity === 'warning')
            return vscode.DiagnosticSeverity.Warning;
        return vscode.DiagnosticSeverity.Hint;
    }
}
