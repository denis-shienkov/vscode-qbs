import * as vscode from 'vscode';

import { QbsDiagnosticParser, QbsDiagnosticParserSeverity } from './qbsdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';
import { substractOne } from '../qbsutils';

enum ParserState {
    Compiler,
    Assembler,
    Linker,
    Details,
}

export class QbsIarDiagnosticParser extends QbsDiagnosticParser {
    private diagnostic?: vscode.Diagnostic;
    private fsPath: string = '';
    private state: ParserState = ParserState.Compiler; // Assume, that the first message belongs to a compiler.
    private readonly compilerRegexp = /^"(?<fsPath>.+\.\S+)",(?<line>\d+)\s+(?<severity>Fatal error|Error|Warning)\[(?<code>\S+)\]:\s*$/;
    private readonly assemblerRegexp = /^"(?<fsPath>.+\.\S+)",(?<line>\d+)\s+(?<severity>Error|Warning)\[(?<code>\d+)\]:\s(?<details_start>.+)$/;
    private readonly linkerRegexp = /^.*(?<severity>Error)\[(?<code>\S+)\]:\s(?<details_start>.+)$/;
    private readonly messageRegexp = /^\s{9,10}(?<details_next>.+)|(?<details_end>])$/;

    public constructor() { super(QbsToolchain.Iar); }

    protected parseLine(line: string): void {
        for (; ;) {
            switch (this.state) {

                // Try to parse the message, assuming that it comes from a compiler at first.
                case ParserState.Compiler: {
                    if (this.diagnostic)
                        return; // Wrong state.
                    const matches = this.compilerRegexp.exec(line);
                    if (matches) { // Yes, it is a starting compiler message.
                        const [, fsPath, linestr, severity, code,] = matches;
                        const lineNo = substractOne(linestr);
                        const range = new vscode.Range(lineNo, 0, lineNo, 999);
                        this.diagnostic = {
                            source: this.toolchainType,
                            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
                            message: '', // Should be available on the next lines.
                            range,
                            code
                        };
                        this.fsPath = fsPath;
                        this.state = ParserState.Details; // Assume that next message be details.
                        return;
                    }
                    // Maybe this message comes from an assembler.
                    this.state = ParserState.Assembler;
                }
                    break;

                // Try to parse the message, assuming that it comes from an assembler at second.
                case ParserState.Assembler: {
                    if (this.diagnostic)
                        return; // Wrong state.
                    const matches = this.assemblerRegexp.exec(line);
                    if (matches) { // Yes, it is a starting assembler message.
                        const [, fsPath, linestr, severity, code, message] = matches;
                        const lineNo = substractOne(linestr);
                        const range = new vscode.Range(lineNo, 0, lineNo, 999);
                        this.diagnostic = {
                            source: this.toolchainType,
                            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
                            message, // Maybe whole details or at least the statrig part of details.
                            range,
                            code
                        };
                        this.fsPath = fsPath;
                        this.state = ParserState.Details; // Assume that next message be details.
                        return;
                    }
                    // Maybe this message comes from a linker.
                    this.state = ParserState.Linker;
                }
                    break;

                // Try to parse the message, assuming that it comes from a linker at third.
                case ParserState.Linker: {
                    if (this.diagnostic)
                        return; // Wrong state.
                    const matches = this.linkerRegexp.exec(line);
                    if (matches) { // Yes, it is a starting linker message.
                        const [, severity, code, message] = matches;
                        const range = new vscode.Range(0, 0, 0, 0);
                        this.diagnostic = {
                            source: this.toolchainType,
                            severity: QbsIarDiagnosticParser.encodeSeverity(severity),
                            message, // Maybe whole details or at least the statrig part of details.
                            range,
                            code
                        };
                        // FIXME: How to use diagnostic without of a file path?
                        // Related issue: https://github.com/microsoft/vscode/issues/112145
                        this.fsPath = '';
                        this.state = ParserState.Details; // Assume that next message be details.
                        return;
                    } else {
                        // This message comes not from assembler/compiler/linker, it
                        // is unknown message, skip it and do reset to the initial state.
                        this.state = ParserState.Compiler;
                        return;
                    }
                }
                    break;

                // Try to parse the multi-line details, comes after the starting
                // assembler/compiler/linker message.
                case ParserState.Details: {
                    if (!this.diagnostic)
                        return; // Wrong state.
                    const matches = this.messageRegexp.exec(line);
                    if (matches) { // Accumulate the multi-line messages.
                        this.diagnostic.message += matches[1] || matches[2];
                        return;
                    } else { // Commit the diagnostic and go to parse the compiler message.
                        this.insertDiagnostic(vscode.Uri.file(this.fsPath), this.diagnostic);
                        // Reset diagnostic && file path.
                        this.diagnostic = undefined;
                        this.fsPath = '';
                        // Maybe this message comes from a assembler/compiler/linker, go to
                        // the initial state.
                        this.state = ParserState.Compiler;
                    }
                }
                    break;

            }
        }
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
