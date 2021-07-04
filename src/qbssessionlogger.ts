import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from './qbssession';

import {QbsOperationStatus} from './datatypes/qbsoperation';
import {QbsOperationType} from './datatypes/qbsoperation';
import {QbsMessageResponse} from './datatypes/qbsmessageresponse';

import * as QbsUtils from './qbsutils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsSessionLogger implements vscode.Disposable {
    private _compileOutput: vscode.OutputChannel;

    constructor(session: QbsSession) {
        session.setLogger(this);

        this._compileOutput = vscode.window.createOutputChannel('QBS Compile Output');

        const appendCompileText = async (text: string) => {
            this._compileOutput.show(true);
            this._compileOutput.appendLine(text);
        };

        const appendCompileOutput = async (result: QbsMessageResponse) => {
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
        session.onWarningMessageReceived(async (result) => await appendCompileOutput(result));
        session.onProtocolErrorMessageReceived(async (result) => await appendCompileOutput(result));

        session.onTaskStarted(async (result) => {
            if (result._description) {
                await appendCompileText(result._description);
            }
        });

        session.onProcessResultReceived(async (result) => {
            const hasOutput = result._stdOutput.length || result._stdError.length;
            if (result._success && !hasOutput) {
                return;
            }
            const exe = `${result._executable} ${result._arguments.join(' ')}`;
            await appendCompileText(exe);
            if (result._stdError.length) {
                const text = result._stdError.join('\n');
                await appendCompileText(text);
            }
            if (result._stdOutput.length) {
                const text = result._stdOutput.join('\n');
                await appendCompileText(text);
            }
        });

        session.onLogMessageReceived(async (result) => {
            if (!result.isEmpty()) {
                const text = result.toString();
                await appendCompileText(text);
            }
        });

        session.onOperationChanged(async (operation) => {
            const elapsed = QbsUtils.msToTime(operation._elapsed);
            if (operation._type === QbsOperationType.Resolve) {
                if (operation._status === QbsOperationStatus.Started) {
                    const text = localize('qbs.session.logger.resolve.message', 'Resolving project...');
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Completed) {
                    const text = localize('qbs.session.logger.resolve.completed.message', 'Project successfully resolved')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    const text = localize('qbs.session.logger.resolve.failed.message', 'Error resolving project')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                }
            } else if (operation._type === QbsOperationType.Build) {
                if (operation._status === QbsOperationStatus.Started) {
                    const text = localize('qbs.session.logger.build.message', 'Building project...');
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Completed) {
                    const text = localize('qbs.session.logger.build.completed.message', 'Project successfully built')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    const text = localize('qbs.session.logger.build.failed.message', 'Error building project')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                }
            } else if (operation._type === QbsOperationType.Clean) {
                if (operation._status === QbsOperationStatus.Started) {
                    const text = localize('qbs.session.logger.clean.message', 'Cleaning project...');
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Completed) {
                    const text = localize('qbs.session.logger.clean.completed.message', 'Project successfully cleaned')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    const text = localize('qbs.session.logger.clean.failed.message', 'Error cleaning project')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                }
            } else if (operation._type === QbsOperationType.Install) {
                if (operation._status === QbsOperationStatus.Started) {
                    const text = localize('qbs.session.logger.install.message', 'Installing project...');
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Completed) {
                    const text = localize('qbs.session.logger.install.completed.message', 'Project successfully installed')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                } else if (operation._status === QbsOperationStatus.Failed) {
                    const text = localize('qbs.session.logger.install.failed.message', 'Error installing project')
                        + localize('qbs.session.logger.elapsed.message', ', elapsed time: ')
                        + `${elapsed}`;
                    await appendCompileText(text);
                }
            }
        });
    }

    dispose() {}

    clearOutput() {
        this._compileOutput.clear();
    }
}
