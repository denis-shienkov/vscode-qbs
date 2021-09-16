import * as vscode from 'vscode';

import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import * as QbsUtils from '../qbsutils';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const ARM_CC_REGEXP = /"(.+\.\S+)",\sline\s(\d+):\s(Error|Warning):\s+(#\d+):\s(.+)$/;
const ARM_CLANG_REGEXP = /^(.+\.\S+):(\d+):(\d+):\s(error|warning):\s(.+)/;
const MCS_COMPILER_REGEXP = /^\*{3}\s(ERROR|WARNING)\s(.+)\sIN\sLINE\s(\d+)\sOF\s(.+\.\S+):\s(.+)$/;
const MCS_ASSEMBLER_REGEXP = /^\*{3}\s(ERROR|WARNING)\s(.+)\sIN\s(\d+)\s\((.+),\sLINE\s\d+\):\s(.+)$/;

export class QbsKeilDiagnosticParser extends QbsDiagnosticParser {
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

        if (this.parseArmCCCompilerMessage(line)) {
            return;
        } else if (this.parseArmClangCompilerMessage(line)) {
            return;
        } else if (this.parseMcsCompilerMessage(line)) {
            return;
        } else if (this.parseMcsAssemblerMessage(line)) {
            return;
        }
    }

    private parseArmCCCompilerMessage(line: string): boolean {
        const matches = ARM_CC_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, file, linestr, severity, code, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(file, diagnostic);
        return true;
    }

    private parseArmClangCompilerMessage(line: string): boolean {
        const matches = ARM_CLANG_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, file, linestr, columnstr, severity, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const columnno = QbsDiagnosticUtils.substractOne(columnstr);
        const range = new vscode.Range(lineno, columnno, lineno, columnno);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range
        };

        this.insertDiagnostic(file, diagnostic);
        return true;
    }

    private parseMcsCompilerMessage(line: string): boolean {
        const matches = MCS_COMPILER_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, severity, code, linestr, file, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(file, diagnostic);
        return true;
    }

    private parseMcsAssemblerMessage(line: string): boolean {
        const matches = MCS_ASSEMBLER_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, severity, code, linestr, file, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(file, diagnostic);
        return true;
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
