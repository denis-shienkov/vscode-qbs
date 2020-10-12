import * as vscode from 'vscode';

// From user code.
import {QbsSession} from './qbssession';
import {QbsSessionTaskStartedResult,
        QbsSessionMessageResult,
        QbsSessionProcessResult} from './qbssessionresults';

export class QbsSessionLogger implements vscode.Disposable {
    // Private members.
    private _compileOutput: vscode.OutputChannel;
    private _messageOutput: vscode.OutputChannel;

    // Constructors.

    constructor(readonly session: QbsSession) {
        this._compileOutput = vscode.window.createOutputChannel('QBS Compile Output');
        this._messageOutput = vscode.window.createOutputChannel('QBS Message Output');

        // Appends the tasks information to the general QBS compile output channel.

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

        // Appends the service information to the separate QBS message output channel.

        session.onLogMessageReceived(result => {
            if (!result.isEmpty()) {
                const msg = `[qbs] ${result.toString()}`;
                this._messageOutput.appendLine(msg);
            }
        });
    }

    // Public overriden methods.

    dispose() {  }
}
