import * as vscode from 'vscode';

import {QbsSession} from './qbssession';
import {QbsSessionMessageResult} from './qbssessionresults';

export class QbsSessionLogger implements vscode.Disposable {
    private _compileOutput: vscode.OutputChannel;
    private _messageOutput: vscode.OutputChannel;

    constructor(readonly session: QbsSession) {
        this._compileOutput = vscode.window.createOutputChannel('QBS Compile Output');
        this._messageOutput = vscode.window.createOutputChannel('QBS Message Output');

        const appendCompileText = (text: string) => {
            this._compileOutput.show();
            this._compileOutput.appendLine(text);
        };

        const appendMessageText = (text: string) => {
            this._messageOutput.appendLine(text);
        };

        const appendCompileOutput = (result: QbsSessionMessageResult) => {
            if (!result.isEmpty()) {
                appendCompileText(result.toString());
            }
        };

        session.onProjectResolved(result => appendCompileOutput(result));
        session.onProjectBuilt(result => appendCompileOutput(result));
        session.onProjectCleaned(result => appendCompileOutput(result));
        session.onProjectInstalled(result => appendCompileOutput(result));
        session.onCommandDescriptionReceived(result => appendCompileOutput(result));
        session.onRunEnvironmentResultReceived(result => appendCompileOutput(result));

        session.onTaskStarted(result => {
            if (result._description.length > 0) {
                appendCompileText(result._description);
            }
        });

        session.onProcessResultReceived(result => {
            const hasOutput = result._stdOutput.length > 0 || result._stdError.length > 0;
            if (result._success && !hasOutput) {
                return;
            }
            const exe = `${result._executable} ${result._arguments.join(' ')}`;
            appendCompileText(exe);
            if (result._stdError.length > 0) {
                const text = result._stdError.join('\n');
                appendCompileText(text);
            }
            if (result._stdOutput.length > 0) {
                const text = result._stdOutput.join('\n');
                appendCompileText(text);
            }
        });

        session.onLogMessageReceived(result => {
            if (!result.isEmpty()) {
                const text = `[qbs] ${result.toString()}`;
                appendMessageText(text);
            }
        });
    }

    dispose() {  }
}
