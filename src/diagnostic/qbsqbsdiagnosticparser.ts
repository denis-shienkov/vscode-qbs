import * as vscode from 'vscode';

import { QbsDiagnosticParser } from './qbsdiagnosticparser';
import { QbsProtocolMessageItemResponse } from '../protocol/qbsprotocolmessageresponse';
import { substractOne } from '../qbsutils';

export class QbsQbsDiagnosticParser extends QbsDiagnosticParser {
    public constructor() { super('qbs'); }

    public parseLine(line: string): void {
        // We don't use this method for current parser.
    }

    public parseMessages(messages: QbsProtocolMessageItemResponse[], severity: vscode.DiagnosticSeverity): void {
        messages.forEach(message => this.parseMessage(message, severity));
    }

    private parseMessage(message: QbsProtocolMessageItemResponse, severity: vscode.DiagnosticSeverity): void {
        const lineNo = substractOne(message.lineNo);
        const columnNo = substractOne(message.columnNo);
        const range = new vscode.Range(lineNo, columnNo, lineNo, 999);
        if (message.fsPath && message.description) {
            const diagnostic: vscode.Diagnostic = {
                source: this.toolchainType,
                severity: severity,
                message: message.description,
                range
            };
            this.insertDiagnostic(vscode.Uri.file(message.fsPath), diagnostic);
        }
    }
}
