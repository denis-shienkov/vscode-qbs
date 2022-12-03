import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import * as QbsUtils from '../qbsutils';

import {performance} from 'perf_hooks';

import {QbsCommandKey} from './qbscommandkey';

import {QbsSession} from '../qbssession';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsOperationStatus} from '../datatypes/qbsoperation';
import {QbsOperationType} from '../datatypes/qbsoperation';
import {QbsOperation} from '../datatypes/qbsoperation';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onBuild(session: QbsSession, request: QbsBuildRequest, timeout: number) : Promise<boolean> {
    const needsSaveOpened = session.settings().saveBeforeBuild();
    if (needsSaveOpened && !await QbsUtils.trySaveAll()) {
        vscode.window.showErrorMessage(localize('qbs.session.save.failed.message',
                                                'Unable to save open files.'));
        return false;
    }

    const needsClearOutput = session.settings().clearOutputBeforeOperation();
    if (needsClearOutput) {
        session.logger()?.clearOutput();
    }

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.build.progress.title', 'Project building'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand(QbsCommandKey.Cancel));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Build, QbsOperationStatus.Started, -1));
        await session.build(request);
        return new Promise<boolean>(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const increment = newPercentage - oldPercentage;
                    if (increment > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message});
                } else {
                    const message = description;
                    p.report({message});
                }
            };

            const taskStartedSubscription = session.onTaskStarted(async (result) => {
                description = result._description;
                maxProgress = result._maxProgress;
                progress = 0;
                await updateReport();
            });
            const taskMaxProgressChangedSubscription = session.onTaskMaxProgressChanged(async (result) => {
                maxProgress = result._maxProgress;
                await updateReport();
            });
            const taskProgressUpdatedSubscription = session.onTaskProgressUpdated(async (result) => {
                progress = result._progress;
                await updateReport();
            });
            const projectBuiltSubscription = session.onProjectBuilt(async (errors) => {
                const elapsed = performance.now() - timestamp;
                const success = errors.isEmpty();
                await session.emitOperation(new QbsOperation(
                    QbsOperationType.Build,
                    success ? QbsOperationStatus.Completed : QbsOperationStatus.Failed,
                    elapsed));
                maxProgress = progress = oldPercentage = 0;
                description = errors.isEmpty() ? localize('qbs.session.build.progress.completed.title','Project successfully built')
                                               : localize('qbs.session.build.progress.failed.title', 'Project building failed');
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectBuiltSubscription.dispose();
                setTimeout(() => {
                    resolve(success);
                }, timeout);
            });
        });
    });
}
