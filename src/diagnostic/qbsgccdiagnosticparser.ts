import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

interface QbsDiagnosticBacktrace {
    rootInstantiation: string;
    requiredFrom: vscode.DiagnosticRelatedInformation[];
}

export class QbsGccDiagnosticParser extends QbsDiagnosticParser {
    private relatedInformation?: vscode.DiagnosticRelatedInformation[];
    private backtrace?: QbsDiagnosticBacktrace;
    private readonly compilerRegexp = /^(?<file>.*):(?<line>\d+):(?<column>\d+):\s+(?:fatal )?(\w*)(?:\sfatale)?\s?:\s+(?<details>.*)/;
    private readonly linkerRegexp = /^(?<file>.*):(?<line>\d+)\s?:\s+(?<details>.*[^\]])$/;

    public constructor() { super(QbsToolchain.Gcc); }

    protected parseLine(line: string): void {
        if (this.checkOnInstantiationOf(line))
            return;
        else if (this.checkOnRequiredFrom(line))
            return;
        else if (this.checkOnBacktraceLimitNotes(line))
            return;
        else if (this.parseCompilerMessage(line))
            return;
        else if (this.parseLinkerMessage(line))
            return;
    }

    private checkOnInstantiationOf(line: string): boolean {
        const matches = /(.*): (In instantiation of.+)/.exec(line);
        if (!matches)
            return false;
        const [, , message] = matches;
        this.backtrace = { rootInstantiation: message, requiredFrom: [] };
        return true;
    }

    private checkOnRequiredFrom(line: string): boolean {
        if (!this.backtrace)
            return false;
        const matches = /(.*):(\d+):(\d+):(  +required from.+)/.exec(line);
        if (!matches)
            return false;

        const [, file, linestr, column, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, parseInt(column), lineNo, 999);
        const location = new vscode.Location(vscode.Uri.file(file), range);
        this.backtrace.requiredFrom.push({ location, message });
        return true;
    }

    private checkOnBacktraceLimitNotes(line: string): boolean {
        const matches = /note: \((.*backtrace-limit.*)\)/.exec(line);
        if (matches && this.relatedInformation && this.relatedInformation.length > 0) {
            const prevRelated = this.relatedInformation[0];
            this.relatedInformation.push({ location: prevRelated.location, message: matches[1] });
            return true;
        }
        return false;
    }

    private parseCompilerMessage(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, columnstr, severity, message] = matches;
        const understandable = (fsPath && linestr && columnstr && severity && message);
        if (!understandable)
            return false;

        const lineno = substractOne(linestr);
        const column = substractOne(columnstr);
        const range = new vscode.Range(lineno, column, lineno, 999);
        if (severity === 'note' && this.relatedInformation) {
            const location = new vscode.Location(vscode.Uri.file(fsPath), range);
            this.relatedInformation.push({ location, message });
        }
        const relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
        if (this.backtrace) {
            const location = new vscode.Location(vscode.Uri.file(fsPath), range);
            relatedInformation.push({ location, message: this.backtrace.rootInstantiation });
            relatedInformation.push(...this.backtrace.requiredFrom);
            this.backtrace = undefined;
        }

        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsGccDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            relatedInformation
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseLinkerMessage(line: string): boolean {
        const matches = this.linkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, message] = matches;
        const understandable = (fsPath && linestr && message);
        if (!understandable)
            return false;

        const lineno = substractOne(linestr);
        const range = new vscode.Range(lineno, 0, lineno, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: vscode.DiagnosticSeverity.Error,
            range,
            message
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private static encodeSeverity(severity: string): vscode.DiagnosticSeverity {
        const s = severity.toLowerCase();
        switch (s) {
            case QbsDiagnosticParserSeverity.Error:
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            case QbsDiagnosticParserSeverity.Info:
            case QbsDiagnosticParserSeverity.Note:
            case QbsDiagnosticParserSeverity.Remark:
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }
}
