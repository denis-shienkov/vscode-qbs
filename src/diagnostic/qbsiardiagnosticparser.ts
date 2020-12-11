import * as vscode from 'vscode';
import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const COMPILER_REGEXP = /^"(.+\.\S+)",(\d+)\s+(Error|Warning)\[(\S+)\]:\s*$/;
const ASSEMBLER_REGEXP = /^"(.+\.\S+)",(\d+)\s+(Error|Warning)\[(\d+)\]:\s(.+)$/;

export class QbsIarDiagnosticParser extends QbsDiagnosticParser {
    private _diagnostic?: vscode.Diagnostic;
    private _file?: string;

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

        if (this.parseCompilerMessage(line)) {
            return;
        } else if (this.parseAssemblerMessage(line)) {
            return;
        }
    }

    private parseFirstMessagePart(line: string): boolean {
        const matches = COMPILER_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, file, linestr, severity, code, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };
        this._diagnostic = diagnostic;
        this._file = file;
        return true;
    }

    private parseLastMessagePart(line: string): boolean {
        const matches = /^\s+(.+)$/.exec(line);
        if (!matches || !this._diagnostic)
            return false;
        this._diagnostic.message = matches[1];
        return true;
    }

    private parseCompilerMessage(line: string): boolean {
        if (!this._diagnostic) {
            if (this.parseFirstMessagePart(line))
                return true;
        } else if (this._file) {
            if (this.parseLastMessagePart(line)) {
                this.insertDiagnostic(this._file, this._diagnostic);
            }
            this._diagnostic = undefined;
            this._file = undefined;
            return true;
        }
        return false;
    }

    private parseAssemblerMessage(line: string): boolean {
        const matches = ASSEMBLER_REGEXP.exec(line);
        if (!matches) {
            return false;
        }

        const [, file, linestr, severity, code, message] = matches;
        const lineno = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.type(),
            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(file, diagnostic);
        return false;
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
