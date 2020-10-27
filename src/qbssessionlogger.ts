import * as vscode from 'vscode';

import {QbsSession} from './qbssession';
import {QbsOperationStatus, QbsOperationType, QbsSessionMessageResult} from './qbssessionresults';

export class QbsSessionLogger implements vscode.Disposable {
    private _compileOutput: vscode.OutputChannel;
    private _messageOutput: vscode.OutputChannel;

    constructor(readonly session: QbsSession) {
        this._compileOutput = vscode.window.createOutputChannel('QBS Compile Output');
        this._messageOutput = vscode.window.createOutputChannel('QBS Message Output');

        const appendCompileText = async (text: string) => {
            this._compileOutput.show();
            this._compileOutput.appendLine(text);
        };

        const appendMessageText = async (text: string) => {
            this._messageOutput.appendLine(text);
        };

        const appendCompileOutput = async (result: QbsSessionMessageResult) => {
            if (!result.isEmpty()) {
                await appendCompileText(result.toString());
            }
        };

        session.onProjectResolved(async (result) => await appendCompileOutput(result));
        session.onProjectBuilt(async (result) => await appendCompileOutput(result));
        session.onProjectCleaned(async (result) => await appendCompileOutput(result));
        session.onProjectInstalled(async (result) => await appendCompileOutput(result));
        session.onCommandDescriptionReceived(async (result) => await appendCompileOutput(result));
        session.onRunEnvironmentResultReceived(async (result) => await appendCompileOutput(result));

        session.onTaskStarted(async (result) => {
            if (result._description.length > 0) {
                await appendCompileText(result._description);
            }
        });

        session.onProcessResultReceived(async (result) => {
            const hasOutput = result._stdOutput.length > 0 || result._stdError.length > 0;
            if (result._success && !hasOutput) {
                return;
            }
            const exe = `${result._executable} ${result._arguments.join(' ')}`;
            await appendCompileText(exe);
            if (result._stdError.length > 0) {
                const text = result._stdError.join('\n');
                await appendCompileText(text);
            }
            if (result._stdOutput.length > 0) {
                const text = result._stdOutput.join('\n');
                await appendCompileText(text);
            }
        });

        session.onLogMessageReceived(async (result) => {
            if (!result.isEmpty()) {
                const text = `[qbs] ${result.toString()}`;
                await appendMessageText(text);
            }
        });

        session.onOperationChanged(async (operation) => {
            if (operation._type === QbsOperationType.Resolve) {
                if (operation._status === QbsOperationStatus.Started) {
                    await appendCompileText('Resolving project...');
                } else if (operation._status === QbsOperationStatus.Completed) {
                    await appendCompileText(`Project successfully resolved, elapsed time: ${operation._elapsed} msecs.`);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    await appendCompileText(`Error resolving project, elapsed time: ${operation._elapsed} msecs.`);
                }
            } else if (operation._type === QbsOperationType.Build) {
                if (operation._status === QbsOperationStatus.Started) {
                    await appendCompileText('Building project...');
                } else if (operation._status === QbsOperationStatus.Completed) {
                    await appendCompileText(`Project successfully built, elapsed time: ${operation._elapsed} msecs.`);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    await appendCompileText(`Error building project, elapsed time: ${operation._elapsed} msecs.`);
                }
            } else if (operation._type === QbsOperationType.Clean) {
                if (operation._status === QbsOperationStatus.Started) {
                    await appendCompileText('Cleaning project...');
                } else if (operation._status === QbsOperationStatus.Completed) {
                    await appendCompileText(`Project successfully cleaned, elapsed time: ${operation._elapsed} msecs.`);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    await appendCompileText(`Error cleaning project, elapsed time: ${operation._elapsed} msecs.`);
                }
            } else if (operation._type === QbsOperationType.Install) {
                if (operation._status === QbsOperationStatus.Started) {
                    await appendCompileText('Installing project...');
                } else if (operation._status === QbsOperationStatus.Completed) {
                    await appendCompileText(`Project successfully installed, elapsed time: ${operation._elapsed} msecs.`);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    await appendCompileText(`Error installing project, elapsed time: ${operation._elapsed} msecs.`);
                }
            }
        });
    }

    dispose() {}
}
