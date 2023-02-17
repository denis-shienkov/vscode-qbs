import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

export class QbsClangClDiagnosticParser extends QbsDiagnosticParser {
    private readonly compilerRegexp = /^(?<file>.+\.\S+)\((?<location>\d+,\d+)\):\s(?<severity>fatal error|error|warning):\s(?<details>.+)/;
    private readonly linkerRegexp = /^(?:\d+>)?(.+?[^\s])\s?:\s(?<severity>(?:fatal )?error)\s(?<code>LNK\d+):\s(?<details>.+)$/;

    public constructor() { super(QbsToolchain.ClangCl); }

    protected parseLine(line: string): void {
        if (this.parseCompilerMessage(line))
            return;
        else if (this.parseLinkerMessage(line))
            return;
    }

    private parseCompilerMessage(line: string): boolean {
        const matches = this.compilerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, location, severity, message] = matches;
        const range = (() => {
            const parts = location.split(',');
            const n0 = substractOne(parts[0]);
            if (parts.length === 2) {
                const n1 = substractOne(parts[1]);
                return new vscode.Range(n0, n1, n0, n1);
            }
            throw new Error('Unable to determine location of Clang diagnostic');
        })();

        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsClangClDiagnosticParser.encodeSeverity(severity),
            message,
            range
        };

        this.insertDiagnostic(vscode.Uri.file(fsPath), diagnostic);
        return true;
    }

    private parseLinkerMessage(line: string): boolean {
        const matches = this.linkerRegexp.exec(line);
        if (!matches)
            return false;

        const [, fsPath, severity, code, message] = matches;
        // Fake location because the linker does not provide a positions or columns in an object files.
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic: vscode.Diagnostic = {
            source: this.toolchainType,
            severity: QbsClangClDiagnosticParser.encodeSeverity(severity),
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
