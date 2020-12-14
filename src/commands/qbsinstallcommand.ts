import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {performance} from 'perf_hooks';

import {QbsCommandKey} from './qbscommandkey';

import {QbsSession} from '../qbssession';

import {QbsInstallRequest} from '../datatypes/qbsinstallrequest';
import {QbsOperationStatus} from '../datatypes/qbsoperation';
import {QbsOperationType} from '../datatypes/qbsoperation';
import {QbsOperation} from '../datatypes/qbsoperation';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onInstall(session: QbsSession, request: QbsInstallRequest) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.install.progress.title', 'Project installing'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand(QbsCommandKey.Cancel));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Install, QbsOperationStatus.Started, -1));
        await session.install(request);
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
            const projectInstalledSubscription = session.onProjectInstalled(async (errors) => {
                const elapsed = performance.now() - timestamp;
                await session.emitOperation(new QbsOperation(
                    QbsOperationType.Install,
                    errors.isEmpty() ? QbsOperationStatus.Completed : QbsOperationStatus.Failed,
                    elapsed));
                description = errors.isEmpty() ? localize('qbs.session.install.progress.completed.title','Project successfully installed')
                                               : localize('qbs.session.install.progress.failed.title', 'Project installing failed');
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectInstalledSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, 5000);
            });
        });
    });
}
