import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsKeilDiagnosticParser extends QbsDiagnosticParser {
    private readonly armCcCompilerRegexp = /"(.+\.\S+)",\sline\s(\d+):\s(Error|Warning):\s+(#\d+):\s(.+)$/;
    private readonly armClangCompilerRegexp = /^(.+\.\S+):(\d+):(\d+):\s(fatal error|error|warning):\s(.+)/;
    private readonly mcsCompilerRegexp = /^\*{3}\s(ERROR|WARNING)\s(.+)\sIN\sLINE\s(\d+)\sOF\s(.+\.\S+):\s(.+)$/;
    private readonly mcsAssemblerRegexp = /^\*{3}\s(ERROR|WARNING)\s(.+)\sIN\s(\d+)\s\((.+),\sLINE\s\d+\):\s(.+)$/;

    public constructor() { super(QbsToolchain.Keil); }

    protected parseLine(line: string): void {
        if (this.parseArmCCCompilerMessage(line))
            return;
        else if (this.parseArmClangCompilerMessage(line))
            return;
        else if (this.parseMcsCompilerMessage(line))
            return;
        else if (this.parseMcsAssemblerMessage(line))
            return;
    }

    private parseArmCCCompilerMessage(line: string): boolean {
        const matches = this.armCcCompilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, severity, code, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseArmClangCompilerMessage(line: string): boolean {
        const matches = this.armClangCompilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, linestr, columnstr, severity, message] = matches;
        const lineNo = substractOne(linestr);
        const columnNo = substractOne(columnstr);
        const range = new vscode.Range(lineNo, columnNo, lineNo, columnNo);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseMcsCompilerMessage(line: string): boolean {
        const matches = this.mcsCompilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, code, linestr, fsPath, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
            message,
            range,
            code
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseMcsAssemblerMessage(line: string): boolean {
        const matches = this.mcsAssemblerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, code, linestr, fsPath, message] = matches;
        const lineNo = substractOne(linestr);
        const range = new vscode.Range(lineNo, 0, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsKeilDiagnosticParser.encodeSeverity(severity),
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
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
}
