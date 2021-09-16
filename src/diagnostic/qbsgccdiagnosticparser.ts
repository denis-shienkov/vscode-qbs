import * as vscode from 'vscode';

import * as QbsDiagnosticUtils from './qbsdiagnosticutils';
import * as QbsUtils from '../qbsutils';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';

const REGEX = /^(.*):(\d+):(\d+):\s+(?:fatal )?(\w*)(?:\sfatale)?\s?:\s+(.*)/;

interface QbsDiagnosticBacktrace {
    rootInstantiation: string;
    requiredFrom: vscode.DiagnosticRelatedInformation[];
}

export class QbsGccDiagnosticParser extends QbsDiagnosticParser {
    private _relatedInformation?: vscode.DiagnosticRelatedInformation[];
    private _backtrace?: QbsDiagnosticBacktrace;

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
        if (this.checkOnInstantiationOf(line)) {
            return;
        } else if (this.checkOnRequiredFrom(line)) {
            return;
        } else if (this.checkOnBacktraceLimitNotes(line)) {
            return;
        }

        const matches = REGEX.exec(line);
        if (!matches) {
            return;
        }

        const [, file, linestr, columnstr, severity, message] = matches;
        if (file && linestr && columnstr && severity && message) {
            const lineno = QbsDiagnosticUtils.substractOne(linestr);
            const column = QbsDiagnosticUtils.substractOne(columnstr);
            const range = new vscode.Range(lineno, column, lineno, 999);
            if (severity === 'note' && this._relatedInformation) {
                const location = new vscode.Location(vscode.Uri.file(file), range);
                this._relatedInformation.push({
                    location,
                    message
                });
            }
            const relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
            if (this._backtrace) {
                const location = new vscode.Location(vscode.Uri.file(file), range);
                relatedInformation.push({
                    location,
                    message: this._backtrace.rootInstantiation
                });
                relatedInformation.push(...this._backtrace.requiredFrom);
                this._backtrace = undefined;
            }

            const diagnostic: vscode.Diagnostic = {
                source: this.type(),
                severity: QbsGccDiagnosticParser.encodeSeverity(severity),
                message,
                range,
                relatedInformation
            };

            this.insertDiagnostic(file, diagnostic);
        }
    }

    private checkOnInstantiationOf(line: string): boolean {
        const matches = /(.*): (In instantiation of.+)/.exec(line);
        if (!matches)
            return false;
        const [, , message] = matches;
        this._backtrace = {
            rootInstantiation: message,
            requiredFrom: []
        };
        return true;
    }

    private checkOnRequiredFrom(line: string): boolean {
        if (!this._backtrace)
            return false;
        const matches = /(.*):(\d+):(\d+):(  +required from.+)/.exec(line);
        if (!matches)
            return false;

        const [, file, linestr, column, message] = matches;
        const lineNo = QbsDiagnosticUtils.substractOne(linestr);
        const range = new vscode.Range(lineNo, parseInt(column), lineNo, 999);
        const location = new vscode.Location(vscode.Uri.file(file), range);
        this._backtrace.requiredFrom.push({
            location,
            message
        });
        return true;

    }

    private checkOnBacktraceLimitNotes(line: string) {
        const matches = /note: \((.*backtrace-limit.*)\)/.exec(line);
        if (matches && this._relatedInformation && this._relatedInformation.length > 0) {
            const message = matches[1];
            const prevRelated = this._relatedInformation[0];
            this._relatedInformation.push({
                location: prevRelated.location,
                message
            });
            return true;
        }
        return false;
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
        case 'error':
            return vscode.DiagnosticSeverity.Error;
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'info':
        case 'note':
        case 'remark':
            return vscode.DiagnosticSeverity.Information;
        default:
            return vscode.DiagnosticSeverity.Hint;
        }
    }
}
