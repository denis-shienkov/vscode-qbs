import * as vscode from 'vscode';

import {QbsSession} from './qbssession';
import {QbsSessionMessageResult} from './qbssessionresults';

export class QbsSessionLogger implements vscode.Disposable {
    private _compileOutput: vscode.OutputChannel;
    private _messageOutput: vscode.OutputChannel;

    constructor(readonly session: QbsSession) {
        this._compileOutput = vscode.window.createOutputChannel('QBS Compile Output');
        this._messageOutput = vscode.window.createOutputChannel('QBS Message Output');

        const appendCompileOutput = (result: QbsSessionMessageResult) => {
            if (!result.isEmpty()) {
                const msg = result.toString();
                this._compileOutput.appendLine(msg);
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
                this._compileOutput.appendLine(result._description);
            }
        });

        session.onProcessResultReceived(result => {
            const hasOutput = result._stdOutput.length > 0 || result._stdError.length > 0;
            if (result._success && !hasOutput) {
                return;
            }
            const exe = `${result._executable} ${result._arguments.join(' ')}`;
            this._compileOutput.appendLine(exe);
            if (result._stdError.length > 0) {
                const msg = result._stdError.join('\n');
                this._compileOutput.appendLine(msg);
            }
            if (result._stdOutput.length > 0) {
                const msg = result._stdOutput.join('\n');
                this._compileOutput.appendLine(msg);
            }
        });

        session.onLogMessageReceived(result => {
            if (!result.isEmpty()) {
                const msg = `[qbs] ${result.toString()}`;
                this._messageOutput.appendLine(msg);
            }
        });
    }

    dispose() {  }
}
