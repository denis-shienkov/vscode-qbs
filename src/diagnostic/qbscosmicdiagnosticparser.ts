import * as vscode from 'vscode';

import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import * as QbsUtils from '../qbsutils';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const COMPILER_REGEXP = /^#(error)\s(.+)\s(.+\.\S+):(\d+)\((\d+)\)\s(.+)$/;

export class QbsCosmicDiagnosticParser extends QbsDiagnosticParser {
    constructor(type: string) {
        super(type);
    }

    parseLines(lines: string[]) {
        for (const line of lines) {
            this.parseLine(line);
        }
    }

    private parseLine(line: string) {
        line = QbsUtils.trimLine(line);
        if (this.parseCompilerWarningsOrErrors(line)) {
            return;
        }
    }

    private parseCompilerWarningsOrErrors(line: string): boolean {
        const matches = COMPILER_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, severity, code, file, linestr, columnstr, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const column = QbsDiagnosticUtils.substractOne(columnstr);
        const range = new vscode.Range(lineno, column, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsCosmicDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(file, diagnostic);
        return true;
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
        case 'error':
            return vscode.DiagnosticSeverity.Error;
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        default:
            return vscode.DiagnosticSeverity.Information;
        }
    }
}
