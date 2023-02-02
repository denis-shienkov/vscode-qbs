import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { msToTime, trySaveAll } from './qbsutils';
import { QbsBuildConfigurationManager } from './qbsbuildconfigurationmanager';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsDiagnosticManager } from './diagnostic/qbsdiagnosticmanager';
import { QbsOutputLogger } from './qbsoutputlogger';
import { QbsProductNode } from './projectexplorer/qbsproductnode';
import { QbsProject } from './qbsproject';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsProjectNode } from './projectexplorer/qbsprojectnode';
import { QbsProtocolBuildRequest } from './protocol/qbsprotocolbuildrequest';
import { QbsProtocolCancelRequest } from './protocol/qbsprotocolcancelrequest';
import { QbsProtocolCleanRequest } from './protocol/qbsprotocolcleanrequest';
import { QbsProtocolCommandEchoMode } from './protocol/qbsprotocolcommandechomode';
import { QbsProtocolErrorHandlingMode } from './protocol/qbsprotocolerrorhandlingmode';
import { QbsProtocolGetRunEnvironmentRequest } from './protocol/qbsprotocolgetrunenvironmentrequest';
import { QbsProtocolInstallRequest } from './protocol/qbsprotocolinstallrequest';
import { QbsProtocolLogLevel } from './protocol/qbsprotocolloglevel';
import { QbsProtocolMessageResponse } from './protocol/qbsprotocolmessageresponse';
import { QbsProtocolProcessResponse } from './protocol/qbsprotocolprocessresponse';
import { QbsProtocolRequest } from './protocol/qbsprotocolrequest';
import { QbsProtocolResolveRequest } from './protocol/qbsprotocolresolverequest';
import { QbsSession, QbsSessionState } from './qbssession';
import { QbsSettings } from './qbssettings';
import { QbsSourceArtifactNode } from './projectexplorer/qbssourceartifactnode';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export enum QbsBuildSystemTimeout {
    AutoResolve = 1000,
    None = 0,
    Progress = 5000, // Timeout after which the notification will be closed, in milliseconds.
}

export class QbsBuildSystem implements vscode.Disposable {
    private static instance: QbsBuildSystem;
    private session: QbsSession = new QbsSession(this.context);
    private timer?: NodeJS.Timeout;

    public static getInstance(): QbsBuildSystem { return QbsBuildSystem.instance; }

    public constructor(private readonly context: vscode.ExtensionContext) {
        QbsBuildSystem.instance = this;

        this.registerCommandsHandlers(context);
        this.subscribeSessionMessages();
        this.subscribeSettingsChanges();
    }

    public dispose(): void { this.session.dispose(); }

    public getSession(): QbsSession { return this.session; }

    /** Starts the resolve command after the some specified @c delay. If this function was
     * called before the previous one worked, then the previous call is canceled. This is done
     * in order to reduce the number of auto-resolve calls, the last one will always be called. */
    public async delayAutoResolve(delay: number): Promise<void> {
        if (!QbsSettings.getAutoResolve())
            return;
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = setTimeout(async () => {
            await vscode.commands.executeCommand(QbsCommandKey.ResolveProject);
            this.timer = undefined;
        }, delay);
    }

    public static getCommandProductNames(data: any): string[] {
        if (data instanceof QbsProductNode) {
            return [data.getFullName()];
        } else if (data instanceof QbsProjectNode) {
            return data.getDependentProductNames();
        } else if (data instanceof Array) {
            return data;
        } else if (typeof data === 'string') {
            return [data];
        } else {
            const name = QbsProjectManager.getInstance().getProject()?.getBuildProductName();
            return (name) ? [name] : [];
        }
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        // Restart the session command.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.RestartSession,
            async () => { await this.restartSession(); }));

        // Cancel command.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CancelOperation,
            async () => { await this.cancelOperation(); }));

        // Resolve commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ResolveProjectWithForceExecution,
            async () => {
                // With force probes execution.
                return await this.resolveWithProgress(true, QbsBuildSystemTimeout.Progress);
            }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ResolveProject,
            async () => {
                return await this.resolveWithProgress(false, QbsBuildSystemTimeout.Progress);
            }));

        // Build commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.BuildProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                return await this.buildWithProgress(productNames, QbsBuildSystemTimeout.Progress);
            }));

        // Install commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.InstallProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                return await this.installWithProgress(productNames, QbsBuildSystemTimeout.Progress);
            }));

        // Clean commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CleanProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                return await this.cleanWithProgress(productNames, QbsBuildSystemTimeout.Progress);
            }));

        // Rebuild commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.RebuildProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                return await this.rebuildWithProgress(productNames,
                    QbsBuildSystemTimeout.Progress, QbsBuildSystemTimeout.Progress);
            }));

        // Compile only command.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CompileOnly,
            async (sourceNode: QbsSourceArtifactNode) => {
                const fsPath = sourceNode.getFsPath();
                return await this.compileOnlyWithProgress(fsPath, QbsBuildSystemTimeout.Progress);
            }));
    }

    private subscribeSessionMessages(): void {
        // Handle the command description messages from the Qbs session.
        this.session.onCommandDescriptionReceived(async (response) => QbsBuildSystem.logMessageResponse(response));

        // Handle the log/warning/error messages from the Qbs session.
        this.session.onLogMessageReceived(async (response) => {
            QbsBuildSystem.logMessageResponse(response);
            QbsBuildSystem.diagnoseQbsInformationMessages(response);
        });
        this.session.onWarningMessageReceived(async (response) => {
            QbsBuildSystem.logMessageResponse(response);
            QbsBuildSystem.diagnoseQbsWarningMessages(response);
        });
        this.session.onErrorMessageReceived(async (response) => {
            QbsBuildSystem.logMessageResponse(response);
            QbsBuildSystem.diagnoseQbsErrorMessages(response);
        });

        // Handle messages from the Qbs session process output (std/err).
        this.session.onProcessResultReceived(async (result) => {
            const hasOutput = result.stdOutput.length || result.stdError.length;
            if (result.success && !hasOutput)
                return;

            const shell = `${result.executable} ${result.arguments.join(' ')}`;
            QbsBuildSystem.logMessage(shell);

            const logStdMessages = (data: string[]) => {
                if (data.length) {
                    const message = data.join('\n');
                    QbsBuildSystem.logMessage(message);
                }
            }

            logStdMessages(result.stdError);
            logStdMessages(result.stdOutput);
            QbsBuildSystem.diagnoseToolchainMessages(result);
        });
    }

    private subscribeSettingsChanges(): void {
        QbsSettings.observeSetting(QbsSettings.SettingKey.AutoResolve,
            async () => await this.delayAutoResolve(QbsBuildSystemTimeout.AutoResolve));
        QbsSettings.observeSetting(QbsSettings.SettingKey.ErrorHandlingMode,
            async () => await this.delayAutoResolve(QbsBuildSystemTimeout.AutoResolve));
        QbsSettings.observeSetting(QbsSettings.SettingKey.ForceProbes,
            async () => await this.delayAutoResolve(QbsBuildSystemTimeout.AutoResolve));
        QbsSettings.observeSetting(QbsSettings.SettingKey.LogLevel,
            async () => await this.delayAutoResolve(QbsBuildSystemTimeout.AutoResolve));
    }

    private async restartSession(): Promise<void> {
        console.log('Restarting session...');
        let disposable: vscode.Disposable;
        return await new Promise<void>(async (resolve) => {
            let restartRequired: boolean = false;
            disposable = this.session.onStateChanged(async (st) => {
                if (st === QbsSessionState.Stopped) {
                    if (restartRequired) {
                        restartRequired = false;
                        console.log('Starting session from state ' + st);
                        await vscode.commands.executeCommand(QbsCommandKey.StartSession);
                        resolve();
                    }
                }
            });

            const st = this.session.getState();
            if (st === QbsSessionState.Started || st === QbsSessionState.Starting) {
                console.log('Stopping session from state ' + st);
                restartRequired = true;
                await vscode.commands.executeCommand(QbsCommandKey.StopSession);
            } else if (st === QbsSessionState.Stopping) {
                restartRequired = true;
            } else if (st === QbsSessionState.Stopped) {
                console.log('Starting session from state ' + st);
                await vscode.commands.executeCommand(QbsCommandKey.StartSession);
                resolve();
            }
        }).finally(() => {
            console.log('Cleanup resources after session restart');
            disposable.dispose();
        });
    }

    private async cancelOperation(): Promise<boolean> {
        console.log('Send cancellation request');
        const request = this.createCancelRequst();
        return await this.session.cancel(request).then(async () => true).finally(() => {
            console.log('Cancellation request sent');
        });
    }

    private async resolveWithProgress(force: boolean, timeout: number): Promise<boolean> {
        const request = this.createResolveRequest(force);
        if (!QbsBuildSystem.ensureRequestIsReady(request))
            return false;
        else if (!QbsBuildSystem.ensureSaveFilesBeforeBuild())
            return false;
        else if (!QbsBuildSystem.ensureClearOutputBeforeOperation())
            return false;
        else if (!request) // Extra checking to use the method `this.session.resolve(request)`.
            return false;

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildsystem.resolve.progress.title', 'Project resolving'),
            cancellable: true
        }, async (p, c) => {
            const timestamp = performance.now();

            QbsBuildSystem.logMessage(localize('qbs.buildsystem.resolve.started.message', 'Resolving project...'));
            QbsBuildSystem.prepareQbsDiagnostics();

            console.log('Send resolve request with force execution: ' + force + ' and timeout: ' + timeout);
            await this.session.resolve(request);
            const disposables: vscode.Disposable[] = [];

            return new Promise<boolean>(async (resolve) => {
                let maxProgress: number = 0;
                let progress: number = 0;
                let description: string = '';
                let oldPercentage: number = 0;

                c.onCancellationRequested(async () => {
                    await vscode.commands.executeCommand(QbsCommandKey.CancelOperation);
                    resolve(false);
                });

                const updateReport = async (showPercentage: boolean = true) => {
                    if (showPercentage) {
                        const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
                        const increment = newPercentage - oldPercentage;
                        if (increment > 0) {
                            oldPercentage = newPercentage;
                            p.report({ increment });
                        }
                        const message = `${description} ${newPercentage} %`;
                        p.report({ message });
                    } else {
                        const message = description;
                        p.report({ message });
                    }
                };

                disposables.push(this.session.onTaskStarted(async (result) => {
                    QbsBuildSystem.logMessage(result.description);
                    description = result.description;
                    maxProgress = result.maxProgress;
                    progress = 0;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskMaxProgressChanged(async (result) => {
                    maxProgress = result.maxProgress;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskProgressUpdated(async (result) => {
                    progress = result.progress;
                    await updateReport();
                }));
                disposables.push(this.session.onProjectResolved(async (result) => {
                    const elapsed = msToTime(performance.now() - timestamp);
                    QbsProjectManager.getInstance().getProject()?.setProjectData(true, result.data);
                    QbsProjectManager.getInstance().getProject()?.notifyOperationCompleted();

                    QbsBuildSystem.logMessageResponse(result.message);
                    QbsBuildSystem.diagnoseQbsInformationMessages(result.message);
                    QbsBuildSystem.submitQbsDiagnostics();

                    const success = (result.message) ? result.message.getIsEmpty() : false;
                    console.log('Received resolve response with result: ' + success);

                    if (success) {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.resolve.completed.message',
                            'Project successfully resolved, elapsed time {0}', elapsed));
                    } else {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.resolve.failed.message',
                            'Error resolving project, elapsed time {0}', elapsed));
                    }

                    description = (success) ? localize('qbs.buildsystem.resolve.progress.completed.title',
                        'Project successfully resolved')
                        : localize('qbs.buildsystem.resolve.progress.failed.title',
                            'Project resolving failed');
                    await updateReport(false);
                    console.log('Waiting for resolve progress popup visible, within timeout: ' + timeout);
                    setTimeout(() => { resolve(success); }, timeout);
                }));
            }).finally(() => {
                console.log('Closing resolve progress popup and cleanup subscriptions');
                disposables.forEach((d) => d.dispose());
            });
        });
    }

    public async buildWithProgress(productNames: string[], timeout: number): Promise<boolean> {
        const request = this.createBuildRequest(productNames);
        if (!QbsBuildSystem.ensureRequestIsReady(request))
            return false;
        else if (!QbsBuildSystem.ensureSaveFilesBeforeBuild())
            return false;
        else if (!QbsBuildSystem.ensureClearOutputBeforeOperation())
            return false;
        else if (!request) // Extra checking to use the method `this.session.build(request)`.
            return false;

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildsystem.build.progress.title', 'Project building'),
            cancellable: true
        }, async (p, c) => {
            const timestamp = performance.now();

            QbsBuildSystem.logMessage(localize('qbs.buildsystem.build.started.message', 'Building project...'));
            QbsBuildSystem.prepareQbsDiagnostics();
            QbsBuildSystem.prepareToolchainDiagnostics();

            console.log('Send build request for products: '
                + QbsBuildSystem.getTargets(productNames) + ' and timeout: ' + timeout);
            await this.session.build(request);
            const disposables: vscode.Disposable[] = [];

            return new Promise<boolean>(async (resolve) => {
                let maxProgress: number = 0;
                let progress: number = 0;
                let description: string = '';
                let oldPercentage: number = 0;

                c.onCancellationRequested(async () => {
                    await vscode.commands.executeCommand(QbsCommandKey.CancelOperation);
                    resolve(false);
                });

                const updateReport = async (showPercentage: boolean = true) => {
                    if (showPercentage) {
                        const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
                        const increment = newPercentage - oldPercentage;
                        if (increment > 0) {
                            oldPercentage = newPercentage;
                            p.report({ increment });
                        }
                        const message = `${description} ${newPercentage} %`;
                        p.report({ message });
                    } else {
                        const message = description;
                        p.report({ message });
                    }
                };

                disposables.push(this.session.onTaskStarted(async (result) => {
                    description = result.description;
                    maxProgress = result.maxProgress;
                    progress = 0;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskMaxProgressChanged(async (result) => {
                    maxProgress = result.maxProgress;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskProgressUpdated(async (result) => {
                    progress = result.progress;
                    await updateReport();
                }));
                disposables.push(this.session.onProjectBuilt(async (result) => {
                    const elapsed = msToTime(performance.now() - timestamp);
                    QbsProjectManager.getInstance().getProject()?.setProjectData(false, result.data);
                    QbsProjectManager.getInstance().getProject()?.notifyOperationCompleted();

                    QbsBuildSystem.logMessageResponse(result.message);
                    QbsBuildSystem.diagnoseQbsInformationMessages(result.message);
                    QbsBuildSystem.submitQbsDiagnostics();
                    QbsBuildSystem.submitToolchainDiagnostics();

                    const success = (result.message) ? result.message.getIsEmpty() : false;
                    console.log('Received build response with result: ' + success);

                    if (success) {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.build.completed.message',
                            'Project successfully built, elapsed time {0}', elapsed));
                    } else {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.build.failed.message',
                            'Error building project, elapsed time {0}', elapsed));
                    }

                    description = (success) ? localize('qbs.buildsystem.build.progress.completed.title',
                        'Project successfully built')
                        : localize('qbs.buildsystem.build.progress.failed.title',
                            'Project building failed');
                    await updateReport(false);
                    console.log('Waiting for build progress popup visible, within timeout: ' + timeout);
                    setTimeout(() => { resolve(success); }, timeout);
                }));
            }).finally(() => {
                console.log('Closing build progress popup and cleanup subscriptions');
                disposables.forEach((d) => d.dispose());
            });
        });
    }

    private async installWithProgress(productNames: string[], timeout: number): Promise<boolean> {
        const request = this.createInstallRequest(productNames);
        if (!QbsBuildSystem.ensureRequestIsReady(request))
            return false;
        else if (!QbsBuildSystem.ensureClearOutputBeforeOperation())
            return false;
        else if (!request) // Extra checking to use the method `this.session.install(request)`.
            return false;

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildsystem.install.progress.title', 'Project installing'),
            cancellable: true
        }, async (p, c) => {
            const timestamp = performance.now();

            QbsBuildSystem.logMessage(localize('qbs.buildsystem.install.started.message', 'Installing project...'));
            QbsBuildSystem.prepareQbsDiagnostics();

            console.log('Send install request for products: '
                + QbsBuildSystem.getTargets(productNames) + ' and timeout: ' + timeout);
            await this.session.install(request);
            const disposables: vscode.Disposable[] = [];

            return new Promise<boolean>(async (resolve) => {
                let maxProgress: number = 0;
                let progress: number = 0;
                let description: string = '';
                let oldPercentage: number = 0;

                c.onCancellationRequested(async () => {
                    await vscode.commands.executeCommand(QbsCommandKey.CancelOperation);
                    resolve(false);
                });

                const updateReport = async (showPercentage: boolean = true) => {
                    if (showPercentage) {
                        const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
                        const increment = newPercentage - oldPercentage;
                        if (increment > 0) {
                            oldPercentage = newPercentage;
                            p.report({ increment });
                        }
                        const message = `${description} ${newPercentage} %`;
                        p.report({ message });
                    } else {
                        const message = description;
                        p.report({ message });
                    }
                };

                disposables.push(this.session.onTaskStarted(async (result) => {
                    description = result.description;
                    maxProgress = result.maxProgress;
                    progress = 0;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskMaxProgressChanged(async (result) => {
                    maxProgress = result.maxProgress;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskProgressUpdated(async (result) => {
                    progress = result.progress;
                    await updateReport();
                }));
                disposables.push(this.session.onProjectInstalled(async (result) => {
                    const elapsed = msToTime(performance.now() - timestamp);

                    QbsBuildSystem.logMessageResponse(result);
                    QbsBuildSystem.diagnoseQbsInformationMessages(result);
                    QbsBuildSystem.submitQbsDiagnostics();

                    const success = (result) ? result.getIsEmpty() : false;
                    console.log('Received install response with result: ' + success);

                    if (success) {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.install.completed.message',
                            'Project successfully installed, elapsed time {0}', elapsed));
                    } else {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.install.failed.message',
                            'Error installing project, elapsed time {0}', elapsed));
                    }

                    description = (success) ? localize('qbs.buildsystem.install.progress.completed.title',
                        'Project successfully installed')
                        : localize('qbs.buildsystem.install.progress.failed.title',
                            'Project installing failed');
                    await updateReport(false);
                    console.log('Waiting for install progress popup visible, within timeout: ' + timeout);
                    setTimeout(() => { resolve(success); }, timeout);
                }));
            }).finally(() => {
                console.log('Closing install progress popup and cleanup subscriptions');
                disposables.forEach((d) => d.dispose());
            });
        });
    }

    private async cleanWithProgress(productNames: string[], timeout: number): Promise<boolean> {
        const request = this.createCleanRequest(productNames);
        if (!QbsBuildSystem.ensureRequestIsReady(request))
            return false;
        else if (!QbsBuildSystem.ensureClearOutputBeforeOperation())
            return false;
        else if (!request) // Extra checking to use the method `this.session.clean(request)`.
            return false;

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildsystem.clean.progress.title', 'Project cleaning'),
            cancellable: true
        }, async (p, c) => {
            const timestamp = performance.now();

            QbsBuildSystem.logMessage(localize('qbs.buildsystem.clean.started.message', 'Cleaning project...'));
            QbsBuildSystem.prepareQbsDiagnostics();

            console.log('Send clean request for products: '
                + QbsBuildSystem.getTargets(productNames) + ' and timeout: ' + timeout);
            await this.session.clean(request);
            const disposables: vscode.Disposable[] = [];

            return new Promise<boolean>(async (resolve) => {
                let maxProgress: number = 0;
                let progress: number = 0;
                let description: string = '';
                let oldPercentage: number = 0;

                c.onCancellationRequested(async () => {
                    await vscode.commands.executeCommand(QbsCommandKey.CancelOperation);
                    resolve(false);
                });

                const updateReport = async (showPercentage: boolean = true) => {
                    if (showPercentage) {
                        const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
                        const increment = newPercentage - oldPercentage;
                        if (increment > 0) {
                            oldPercentage = newPercentage;
                            p.report({ increment });
                        }
                        const message = `${description} ${newPercentage} %`;
                        p.report({ message });
                    } else {
                        const message = description;
                        p.report({ message });
                    }
                };

                disposables.push(this.session.onTaskStarted(async (result) => {
                    description = result.description;
                    maxProgress = result.maxProgress;
                    progress = 0;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskMaxProgressChanged(async (result) => {
                    maxProgress = result.maxProgress;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskProgressUpdated(async (result) => {
                    progress = result.progress;
                    await updateReport();
                }));
                disposables.push(this.session.onProjectCleaned(async (result) => {
                    const elapsed = msToTime(performance.now() - timestamp);
                    QbsProjectManager.getInstance().getProject()?.notifyOperationCompleted();

                    QbsBuildSystem.logMessageResponse(result);
                    QbsBuildSystem.diagnoseQbsInformationMessages(result);
                    QbsBuildSystem.submitQbsDiagnostics();

                    const success = (result) ? result.getIsEmpty() : false;
                    console.log('Received clean response with result: ' + success);

                    if (success) {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.clean.completed.message',
                            'Project successfully cleaned, elapsed time {0}', elapsed));
                    } else {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.clean.failed.message',
                            'Error cleaning project, elapsed time {0}', elapsed));
                    }

                    description = (success) ? localize('qbs.buildsystem.clean.progress.completed.title',
                        'Project successfully cleaned')
                        : localize('qbs.buildsystem.clean.progress.failed.title',
                            'Project cleaning failed');
                    await updateReport(false);
                    console.log('Waiting for clean progress popup visible, within timeout: ' + timeout);
                    setTimeout(() => { resolve(success); }, timeout);
                }));
            }).finally(() => {
                console.log('Closing clean progress popup and cleanup subscriptions');
                disposables.forEach((d) => d.dispose());
            });
        });
    }

    private async rebuildWithProgress(productNames: string[],
        cleanTimeout: number, buildTimeout: number): Promise<boolean> {
        return await this.cleanWithProgress(productNames, cleanTimeout)
            .then(async (result) => {
                if (!result)
                    return false;
                return await this.buildWithProgress(productNames, buildTimeout);
            });
    }

    private async compileOnlyWithProgress(fsPath: string, timeout: number): Promise<boolean> {
        const request = this.createCompileOnlyRequest(fsPath);
        if (!QbsBuildSystem.ensureRequestIsReady(request))
            return false;
        else if (!QbsBuildSystem.ensureClearOutputBeforeOperation())
            return false;
        else if (!request) // Extra checking to use the method `this.session.build(request)`.
            return false;

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildsystem.compile.progress.title', 'File compiling'),
            cancellable: true
        }, async (p, c) => {
            const timestamp = performance.now();

            QbsBuildSystem.logMessage(localize('qbs.buildsystem.compile.started.message', 'Compiling file...'));
            QbsBuildSystem.prepareQbsDiagnostics();
            QbsBuildSystem.prepareToolchainDiagnostics();

            console.log('Send compile only request for file: ' + fsPath + ' and timeout: ' + timeout);
            await this.session.build(request);
            const disposables: vscode.Disposable[] = [];

            return new Promise<boolean>(async (resolve) => {
                let maxProgress: number = 0;
                let progress: number = 0;
                let description: string = '';
                let oldPercentage: number = 0;

                c.onCancellationRequested(async () => {
                    await vscode.commands.executeCommand(QbsCommandKey.CancelOperation);
                    resolve(false);
                });

                const updateReport = async (showPercentage: boolean = true) => {
                    if (showPercentage) {
                        const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
                        const increment = newPercentage - oldPercentage;
                        if (increment > 0) {
                            oldPercentage = newPercentage;
                            p.report({ increment });
                        }
                        const message = `${description} ${newPercentage} %`;
                        p.report({ message });
                    } else {
                        const message = description;
                        p.report({ message });
                    }
                };

                disposables.push(this.session.onTaskStarted(async (result) => {
                    description = result.description;
                    maxProgress = result.maxProgress;
                    progress = 0;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskMaxProgressChanged(async (result) => {
                    maxProgress = result.maxProgress;
                    await updateReport();
                }));
                disposables.push(this.session.onTaskProgressUpdated(async (result) => {
                    progress = result.progress;
                    await updateReport();
                }));
                disposables.push(this.session.onProjectBuilt(async (result) => {
                    const elapsed = msToTime(performance.now() - timestamp);
                    QbsProjectManager.getInstance().getProject()?.setProjectData(false, result.data);

                    QbsBuildSystem.logMessageResponse(result.message);
                    QbsBuildSystem.diagnoseQbsInformationMessages(result.message);
                    QbsBuildSystem.submitQbsDiagnostics();
                    QbsBuildSystem.submitToolchainDiagnostics();

                    const success = (result.message) ? result.message.getIsEmpty() : false;
                    console.log('Received compile only response with result: ' + success);

                    if (success) {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.compile.completed.message',
                            'File successfully compiled, elapsed time {0}', elapsed));
                    } else {
                        QbsBuildSystem.logMessage(localize('qbs.buildsystem.compile.failed.message',
                            'Error compiling file, elapsed time {0}', elapsed));
                    }

                    description = (success) ? localize('qbs.buildsystem.compile.progress.completed.title',
                        'File successfully compiled')
                        : localize('qbs.buildsystem.compile.progress.failed.title',
                            'File compiling failed');
                    await updateReport(false);
                    console.log('Waiting for compile only progress popup visible, within timeout: ' + timeout);
                    setTimeout(() => { resolve(success); }, timeout);
                }));
            }).finally(() => {
                console.log('Closing compile only progress popup and cleanup subscriptions');
                disposables.forEach((d) => d.dispose());
            });
        });
    }

    public async fetchProductRunEnvironment(productName: string): Promise<any> {
        return new Promise<any>(resolve => {
            const disposable = this.session.onRunEnvironmentReceived(async (result) => {
                await disposable.dispose();
                const environment = Object.entries(result.getData()).map(function ([k, v]) {
                    return { name: k, value: v };
                });
                console.log('Received run environment for product: ' + productName + ' as ' + environment);
                resolve(environment);
            });
            const request = new QbsProtocolGetRunEnvironmentRequest();
            request.setProduct(productName);
            console.log('Send request to get the run environmnt for product: ' + productName);
            this.session.getRunEnvironment(request);
        });
    }

    private createCancelRequst(): QbsProtocolCancelRequest { return new QbsProtocolCancelRequest(); }

    private createResolveRequest(forceResolve: boolean): QbsProtocolResolveRequest | undefined {
        const project = QbsBuildSystem.getProject();
        if (!project)
            return;
        const buildRoot = QbsBuildSystem.getBuildRootDirectoryPathFromSettings();
        if (!buildRoot)
            return;
        const dryRun = QbsBuildSystem.getDryRunFromSettings(buildRoot);
        const errorHandlingMode = QbsBuildSystem.getErrorHandlingModeFromSettings();
        const forceProbeExecution = forceResolve || QbsBuildSystem.getForceProbeExecutionFromSettings();
        const logLevel = QbsBuildSystem.getLogLevelFromSettings();
        const request = new QbsProtocolResolveRequest(buildRoot, dryRun, errorHandlingMode,
            forceProbeExecution, logLevel);

        const settingsDirectory = QbsBuildSystem.getSettingsDirectoryPathFromSettings();
        const fsPath = project.getFsPath();
        const profileName = project.getProfileName(); // An undefined value means the default profile.
        const configurationName = project.getConfigurationName(); // An undefined value means the debug configuration.

        request.setSettingsDirectory(settingsDirectory);
        request.setProjectFilePath(fsPath);
        request.setConfigurationName(project.getConfigurationName());
        request.setTopLevelProfile(project.getProfileName());

        // Find the current configuration by it's a name to get the overriden properties.
        const configuration = QbsBuildConfigurationManager.getInstance().findConfiguration(project.getConfigurationName());
        request.setOverriddenProperties(configuration ? configuration.properties : undefined);
        console.log('Create resolve request:\n'
            + '\tbuildRoot: ' + buildRoot + '\n'
            + '\tdryRun: ' + dryRun + '\n'
            + '\terrorHandlingMode: ' + errorHandlingMode + '\n'
            + '\tforceProbeExecution: ' + forceProbeExecution + '\n'
            + '\tlogLevel: ' + logLevel + '\n'
            + '\tfsPath: ' + fsPath + '\n'
            + '\tprofileName: ' + profileName + '\n'
            + '\tconfigurationName: ' + configurationName
        );
        return request;
    }

    private createBuildRequest(productNames: string[]): QbsProtocolBuildRequest | undefined {
        const cleanInstallRoot = QbsBuildSystem.getCleanInstallRootFromSettings();
        const commandEchoMode = QbsBuildSystem.getCommandEchoModeFromSettings();
        const keepGoing = QbsBuildSystem.getKeepGoingFromSettings();
        const logLevel = QbsBuildSystem.getLogLevelFromSettings();
        const maxJobs = QbsBuildSystem.getMaxJobsFromSettings();
        const install = QbsBuildSystem.getInstallFromSettings();
        const request = new QbsProtocolBuildRequest(cleanInstallRoot, commandEchoMode, keepGoing, logLevel, maxJobs, install);
        request.setProducts(productNames);
        console.log('Create build request:\n'
            + '\tcleanInstallRoot: ' + cleanInstallRoot + '\n'
            + '\tcommandEchoMode: ' + commandEchoMode + '\n'
            + '\tkeepGoing: ' + keepGoing + '\n'
            + '\tlogLevel: ' + logLevel + '\n'
            + '\tmaxJobs: ' + maxJobs + '\n'
            + '\tinstall: ' + install + '\n'
            + '\tproducts: ' + productNames
        );
        return request;
    }

    private createInstallRequest(productNames: string[]): QbsProtocolInstallRequest | undefined {
        const keepGoing = QbsBuildSystem.getKeepGoingFromSettings();
        const logLevel = QbsBuildSystem.getLogLevelFromSettings();
        const request = new QbsProtocolInstallRequest(keepGoing, logLevel);
        request.setProducts(productNames);
        console.log('Create install request:\n'
            + '\tkeepGoing: ' + keepGoing + '\n'
            + '\tlogLevel: ' + logLevel + '\n'
            + '\tproducts: ' + productNames
        );
        return request;
    }

    private createCleanRequest(productNames: string[]): QbsProtocolCleanRequest | undefined {
        const keepGoing = QbsBuildSystem.getKeepGoingFromSettings();
        const logLevel = QbsBuildSystem.getLogLevelFromSettings();
        const request = new QbsProtocolCleanRequest(keepGoing, logLevel);
        request.setProducts(productNames);
        console.log('Create clean request:\n'
            + '\tkeepGoing: ' + keepGoing + '\n'
            + '\tlogLevel: ' + logLevel + '\n'
            + '\tproducts: ' + productNames
        );
        return request;
    }

    private createCompileOnlyRequest(fsPath: string): QbsProtocolBuildRequest | undefined {
        const cleanInstallRoot = QbsBuildSystem.getCleanInstallRootFromSettings();
        const commandEchoMode = QbsBuildSystem.getCommandEchoModeFromSettings();
        const keepGoing = QbsBuildSystem.getKeepGoingFromSettings();
        const logLevel = QbsBuildSystem.getLogLevelFromSettings();
        const maxJobs = QbsBuildSystem.getMaxJobsFromSettings();
        const install = QbsBuildSystem.getInstallFromSettings();
        const request = new QbsProtocolBuildRequest(cleanInstallRoot, commandEchoMode, keepGoing, logLevel, maxJobs, install);
        request.setChangedFiles([fsPath]);
        request.setFilesToConsider([fsPath]);
        request.setActiveFileTags(['obj', 'hpp']);
        console.log('Create compile only request:\n'
            + '\tcleanInstallRoot: ' + cleanInstallRoot + '\n'
            + '\tcommandEchoMode: ' + commandEchoMode + '\n'
            + '\tkeepGoing: ' + keepGoing + '\n'
            + '\tlogLevel: ' + logLevel + '\n'
            + '\tmaxJobs: ' + maxJobs + '\n'
            + '\tinstall: ' + install + '\n'
            + '\tchanged files: ' + fsPath
        );
        return request;
    }

    private static ensureRequestIsReady(request?: QbsProtocolRequest): boolean {
        if (!request) {
            vscode.window.showWarningMessage(localize('qbs.buildsystem.noproject.message',
                'Unable to start operation due to the project is not selected.'));
            return false;
        }
        return true;
    }

    private static ensureSaveFilesBeforeBuild(): boolean {
        const needsSaveOpened = QbsBuildSystem.getSaveBeforeBuildFromSettings();
        if (needsSaveOpened && !trySaveAll()) {
            vscode.window.showErrorMessage(localize('qbs.buildsystem.save.failed.message',
                'Unable to save the open files.'));
            return false;
        }
        return true;
    }

    private static ensureClearOutputBeforeOperation(): boolean {
        const needsClearOutput = QbsBuildSystem.getClearOutputBeforeOperationFromSettings();
        if (needsClearOutput)
            QbsOutputLogger.getInstance().clearOutput();
        return true;
    }

    private static logMessageResponse(response?: QbsProtocolMessageResponse): void {
        if (!response || response.getIsEmpty())
            return;
        const message = response.toString();
        if (!message)
            return;
        this.logMessage(message);
    }

    private static logMessage(message: string): void { QbsOutputLogger.getInstance().logOutput(message); }

    // Route to diagnostics manager.

    private static diagnoseQbsInformationMessages(response?: QbsProtocolMessageResponse): void {
        if (response)
            QbsDiagnosticManager.getInstance().handleQbsInformationMessages(response);
    }

    private static diagnoseQbsWarningMessages(response?: QbsProtocolMessageResponse): void {
        if (response)
            QbsDiagnosticManager.getInstance().handleQbsWarningMessages(response);
    }

    private static diagnoseQbsErrorMessages(response?: QbsProtocolMessageResponse): void {
        if (response)
            QbsDiagnosticManager.getInstance().handleQbsErrorMessages(response);
    }

    private static diagnoseToolchainMessages(response?: QbsProtocolProcessResponse): void {
        if (response)
            QbsDiagnosticManager.getInstance().handleToolchainMessages(response);
    }

    private static prepareQbsDiagnostics(): void { QbsDiagnosticManager.getInstance().prepareQbsDiagnostics(); }
    private static submitQbsDiagnostics(): void { QbsDiagnosticManager.getInstance().submitQbsDiagnostics(); }

    private static prepareToolchainDiagnostics(): void {
        const projectData = QbsProjectManager.getInstance().getProject()?.getProjectData();
        if (projectData)
            QbsDiagnosticManager.getInstance().prepareToolchainDiagnostics(projectData);
    }

    private static submitToolchainDiagnostics(): void { QbsDiagnosticManager.getInstance().submitToolchainDiagnostics(); }

    private static getProject(): QbsProject | undefined {
        const project = QbsProjectManager.getInstance().getProject();
        if (project)
            return project;
        vscode.window.showErrorMessage(localize('qbs.buildsystem.noproject.message',
            `Unable to get the Qbs project because no any project is loaded.`));
    }

    private static getSourceRootDirectoryFromSettings(fsPath: string): string | undefined {
        const result = QbsSettings.getSourceRootDirectory(fsPath);
        if (result)
            return result;
        vscode.window.showWarningMessage(localize('qbs.buildsystem.nosourceroot.message',
            'Unable get the source root directory path because no any workspace folder is open.'));
    }

    private static getFullPathFromSettings(fsPath: string): string | undefined {
        const project = QbsBuildSystem.getProject();
        if (!project)
            return;
        const sourceRoot = QbsBuildSystem.getSourceRootDirectoryFromSettings(project.getFsPath());
        if (!sourceRoot)
            return;
        const projectName = project.getName();
        const profileName = project.getProfileName() || 'default'; // The undefined build profile name means the `default` profile.
        const configurationName = project.getConfigurationName() || 'debug'; // The undefined build configuration name means the `debug` configuration.

        fsPath = QbsSettings.substituteSourceRoot(fsPath, sourceRoot);
        fsPath = QbsSettings.substituteProjectName(fsPath, projectName);
        fsPath = QbsSettings.substituteBuildProfileName(fsPath, profileName);
        fsPath = QbsSettings.substituteBuildConfigurationName(fsPath, configurationName);
        return fsPath;
    }

    private static getBuildRootDirectoryPathFromSettings(): string | undefined {
        return QbsBuildSystem.getFullPathFromSettings(QbsSettings.getBuildDirectory());
    }

    private static getSettingsDirectoryPathFromSettings(): string | undefined {
        return QbsBuildSystem.getFullPathFromSettings(QbsSettings.getSettingsDirectory());
    }

    private static getCleanInstallRootFromSettings(): boolean { return QbsSettings.getCleanInstallRoot(); }
    private static getClearOutputBeforeOperationFromSettings(): boolean { return QbsSettings.getClearOutputBeforeOperation(); }
    private static getCommandEchoModeFromSettings(): QbsProtocolCommandEchoMode { return QbsSettings.getCommandEchoMode(); }
    private static getDryRunFromSettings(buildRoot: string): boolean { return !fs.existsSync(buildRoot); }
    private static getErrorHandlingModeFromSettings(): QbsProtocolErrorHandlingMode { return QbsSettings.getErrorHandlingMode(); }
    private static getForceProbeExecutionFromSettings(): boolean { return QbsSettings.getForceProbes(); }
    private static getInstallFromSettings(): boolean { return QbsSettings.getInstallAfterBuild(); }
    private static getKeepGoingFromSettings(): boolean { return QbsSettings.getKeepGoing(); }
    private static getLogLevelFromSettings(): QbsProtocolLogLevel { return QbsSettings.getLogLevel(); }
    private static getMaxJobsFromSettings(): number { return QbsSettings.getMaxJobs(); }
    private static getSaveBeforeBuildFromSettings(): boolean { return QbsSettings.getSaveBeforeBuild(); }

    private static getTargets(products: string[]): string {
        return (products && (products.length > 0)) ? products.join(';') : localize('qbs.select.build.product.placeholder', 'ALL');
    }
}
