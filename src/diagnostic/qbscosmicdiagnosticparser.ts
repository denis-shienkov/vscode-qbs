import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsCosmicDiagnosticParser extends QbsDiagnosticParser {
    private readonly compilerRegexp = /^#(error)\s(.+)\s(.+\.\S+):(\d+)\((\d+)\)\s(.+)$/;

    public constructor() { super(QbsToolchain.Cosmic); }

    protected parseLine(line: string): void {
        if (this.parseCompilerWarningsOrErrors(line))
            return;
    }

    private parseCompilerWarningsOrErrors(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, severity, code, fsPath, linestr, columnstr, message] = matches;
        const lineNo = substractOne(linestr);
        const columnNo = substractOne(columnstr);
        const range = new vscode.Range(lineNo, columnNo, lineNo, 999);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsCosmicDiagnosticParser.encodeSeverity(severity),
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
                return vscode.DiagnosticSeverity.Error;
            case QbsDiagnosticParserSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }
}
