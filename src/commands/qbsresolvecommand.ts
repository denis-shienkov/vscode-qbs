import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {performance} from 'perf_hooks';

import {QbsCommandKey} from './qbscommandkey';

import {QbsSession} from '../qbssession';

import {QbsOperationStatus} from '../datatypes/qbsoperation';
import {QbsOperationType} from '../datatypes/qbsoperation';
import {QbsOperation} from '../datatypes/qbsoperation';
import {QbsResolveRequest} from '../datatypes/qbsresolverequest';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onResolve(session: QbsSession, request: QbsResolveRequest, timeout: number) {
    const needsClearOutput = session.settings().clearOutputBeforeOperation();
    if (needsClearOutput) {
        session.logger()?.clearOutput();
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.resolve.progress.title', 'Project resolving'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand(QbsCommandKey.Cancel));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Resolve, QbsOperationStatus.Started, -1));
        await session.resolve(request);
        return new Promise<void>(resolve => {
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
            const projectResolvedSubscription = session.onProjectResolved(async (errors) => {
                const elapsed = performance.now() - timestamp;
                await session.emitOperation(new QbsOperation(
                    QbsOperationType.Resolve,
                    errors.isEmpty() ? QbsOperationStatus.Completed : QbsOperationStatus.Failed,
                    elapsed));
                description = errors.isEmpty() ? localize('qbs.session.resolve.progress.completed.title','Project successfully resolved')
                                               : localize('qbs.session.resolve.progress.failed.title', 'Project resolving failed');
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectResolvedSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, timeout);
            });
        });
    });
}
