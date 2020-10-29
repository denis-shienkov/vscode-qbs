import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as path from 'path';
import {performance} from 'perf_hooks';

import * as QbsSelectors from './qbsselectors';
import * as QbsUtils from './qbsutils';

import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsOperation, QbsOperationStatus, QbsOperationType} from './qbssessionresults';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

async function onDetectProfilesCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.detect.profiles.progress.title', 'Detecting profiles...')
    }, async (p) => {
        const success = await session.settings().detectProfiles();
        return new Promise(resolve => {
            p.report({
                increment: success ? 100 : 0,
                message: localize('qbs.detect.profiles.progress.message',
                                  success ? 'Completed' : 'Failed')
            });

            setTimeout(() => {
                resolve();
            }, 3000);
        });
    });
}

async function onRestoreProjectCommand(session: QbsSession) {
    await session.restoreProject();
}

async function onAutoRestartSessionCommand(session: QbsSession) {
    await new Promise<void>(resolve => {
        if (!session.settings().ensureQbsExecutableConfigured()) {
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        }

        let autoRestartRequired: boolean = false;
        const statusChangedSubscription = session.onStatusChanged(async (sessionStatus) => {
            if (sessionStatus === QbsSessionStatus.Stopped) {
                if (autoRestartRequired) {
                    autoRestartRequired = false;
                    await vscode.commands.executeCommand('qbs.startSession');
                    await statusChangedSubscription.dispose();
                    resolve();
                }
            }
        });

        const sessionStatus = session.status();
        if (sessionStatus === QbsSessionStatus.Started || sessionStatus === QbsSessionStatus.Starting) {
            autoRestartRequired = true;
            vscode.commands.executeCommand('qbs.stopSession');
            statusChangedSubscription.dispose();
            resolve();
        } else if (sessionStatus === QbsSessionStatus.Stopping) {
            autoRestartRequired = true;
        } else if (sessionStatus === QbsSessionStatus.Stopped) {
            vscode.commands.executeCommand('qbs.startSession');
            statusChangedSubscription.dispose();
            resolve();
        }
    });
}

async function onStartSessionCommand(session: QbsSession) {
    await session.start();
}

async function onStopSessionCommand(session: QbsSession) {
    await session.stop();
}

async function onSelectProjectCommand(session: QbsSession) {
    await QbsSelectors.displayWorkspaceProjectSelector(session);
}

async function onSelectProfileCommand(session: QbsSession) {
    await QbsSelectors.displayProfileSelector(session);
}

async function onSelectConfigurationCommand(session: QbsSession) {
    await QbsSelectors.displayConfigurationSelector(session);
}

async function onSelectBuildProductCommand(session: QbsSession) {
    await QbsSelectors.displayBuildProductSelector(session);
}

async function onSelectRunProductCommand(session: QbsSession) {
    await QbsSelectors.displayRunProductSelector(session);
}

async function onSelectDebuggerCommand(session: QbsSession) {
    await QbsSelectors.displayDebuggerSelector(session);
}

async function  onResolveProjectWithForceProbesExecutionCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.resolve.progress.title', 'Project resolving'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand('qbs.cancel'));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Resolve, QbsOperationStatus.Started, -1));
        await session.resolveProjectWithForceProbesExecution();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const delta = newPercentage - oldPercentage;
                    if (delta > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment: delta});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message: message});
                } else {
                    const message = description;
                    p.report({ message: message});
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
                description = errors.isEmpty() ? 'Project successfully resolved'
                                               : 'Project resolving failed';
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectResolvedSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, 5000);
            });
        });
    });
}

async function onResolveProjectCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.resolve.progress.title', 'Project resolving'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand('qbs.cancel'));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Resolve, QbsOperationStatus.Started, -1));
        await session.resolveProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const delta = newPercentage - oldPercentage;
                    if (delta > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment: delta});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message: message});
                } else {
                    const message = description;
                    p.report({ message: message});
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
                description = errors.isEmpty() ? 'Project successfully resolved'
                                               : 'Project resolving failed';
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectResolvedSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, 5000);
            });
        });
    });
}

async function onBuildProjectCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.build.progress.title', 'Project building'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand('qbs.cancel'));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Build, QbsOperationStatus.Started, -1));
        await session.buildProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const delta = newPercentage - oldPercentage;
                    if (delta > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment: delta});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message: message});
                } else {
                    const message = description;
                    p.report({ message: message});
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
                await session.emitOperation(new QbsOperation(
                    QbsOperationType.Build,
                    errors.isEmpty() ? QbsOperationStatus.Completed : QbsOperationStatus.Failed,
                    elapsed));
                maxProgress = progress = oldPercentage = 0;
                description = errors.isEmpty() ? 'Project successfully built'
                                               : 'Project building failed';
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectBuiltSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, 5000);
            });
        });
    });
}

async function onCleanProjectCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.clean.progress.title', 'Project cleaning'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand('qbs.cancel'));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Clean, QbsOperationStatus.Started, -1));
        await session.cleanProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const delta = newPercentage - oldPercentage;
                    if (delta > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment: delta});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message: message});
                } else {
                    const message = description;
                    p.report({ message: message});
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
            const projectCleanedSubscription = session.onProjectCleaned(async (errors) => {
                const elapsed = performance.now() - timestamp;
                await session.emitOperation(new QbsOperation(
                    QbsOperationType.Clean,
                    errors.isEmpty() ? QbsOperationStatus.Completed : QbsOperationStatus.Failed,
                    elapsed));
                description = errors.isEmpty() ? 'Project successfully cleaned'
                                               : 'Project cleaning failed';
                await updateReport(false);
                await taskStartedSubscription.dispose();
                await taskMaxProgressChangedSubscription.dispose();
                await taskProgressUpdatedSubscription.dispose();
                await projectCleanedSubscription.dispose();
                setTimeout(() => {
                    resolve();
                }, 5000);
            });
        });
    });
}

async function onInstallProjectCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.install.progress.title', 'Project installing'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(async () => await vscode.commands.executeCommand('qbs.cancel'));
        const timestamp = performance.now();
        await session.emitOperation(new QbsOperation(QbsOperationType.Install, QbsOperationStatus.Started, -1));
        await session.installProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = async (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0)
                        ? Math.round((100 * progress) / maxProgress) : 0;
                    const delta = newPercentage - oldPercentage;
                    if (delta > 0) {
                        oldPercentage = newPercentage;
                        p.report({increment: delta});
                    }
                    const message = `${description} ${newPercentage} %`;
                    p.report({message: message});
                } else {
                    const message = description;
                    p.report({ message: message});
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
                description = errors.isEmpty() ? 'Project successfully installed'
                                               : 'Project installing failed';
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

async function onCancelJobCommand(session: QbsSession) {
    await session.cancelJob();
}

async function onGetRunEnvironmentCommand(session: QbsSession) {
    await session.getRunEnvironment();
}

async function onRunProductCommand(session: QbsSession) {
    const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
    for (const terminal of terminals) {
        if (terminal.name === 'QBS Run') {
            terminal.dispose();
        }
    }

    // Retrieve the run environment for the selected product.
    const success = await session.ensureRunEnvironmentUpdated();
    if (!success) {
        vscode.window.showErrorMessage(localize('qbs.product.env.missed.error.message',
                                                'Run environment missing, please select the runnable product.'));
        return;
    }

    const runStep = session.project()?.runStep();
    const env = runStep?.runEnvironment()?.data();
    const executable = runStep?.targetExecutable();
    if (!executable || !env) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Target executable missing, please re-build the product.'));
        return;
    } else {
        const escaped = QbsUtils.escapeShell(executable);
        const terminal = vscode.window.createTerminal({
            name: 'QBS Run',
            env: env,
            cwd: path.dirname(executable)
        });
        if (process.platform === 'darwin') {
            // workaround for macOS system integrity protection
            let specialEnvs: string[] = ['DYLD_LIBRARY_PATH', 'DYLD_FRAMEWORK_PATH'];
            for (let specialEnv of specialEnvs) {
                if (env[specialEnv]) {
                    terminal.sendText('export ' + specialEnv + '=' + QbsUtils.escapeShell(env[specialEnv]));
                }
            }
        }
        terminal.sendText(escaped);
        terminal.show();
    }
}

async function onDebugProductCommand(session: QbsSession) {
    const runStep = session.project()?.runStep();
    const debuggerConfig = runStep?.debugger();
    if (!debuggerConfig) {
        vscode.window.showErrorMessage(localize('qbs.product.debugger.missed.error.message',
                                                'Debugger missing, please select the debugger.'));
        return;
    }

    // Retrieve the run environment for the selected product.
    const success = await session.ensureRunEnvironmentUpdated();
    if (!success) {
        vscode.window.showErrorMessage(localize('qbs.product.env.missed.error.message',
                                                'Run environment missing, please select the runnable product.'));
        return;
    }

    const env = runStep?.runEnvironment()?.data();
    const executable = runStep?.targetExecutable();
    if (!executable || !env) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Target executable missing, please re-build the product.'));
        return;
    }

    const targetConfig = {
        program: executable,
        cwd: path.dirname(executable),
        env: env
    };

    const fullConfig = Object.assign(debuggerConfig.data(), targetConfig);
    await vscode.debug.startDebugging(undefined, fullConfig);
}

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.detectProfiles', async () => {
        await onDetectProfilesCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.restoreProject', async () => {
        await onRestoreProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.autoRestartSession', async () => {
        await onAutoRestartSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.startSession', async () => {
        await onStartSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.stopSession', async () => {
        await onStopSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProject', async () => {
        await onSelectProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProfile', async () => {
        await onSelectProfileCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectConfiguration', async () => {
        await onSelectConfigurationCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectBuild', async () => {
        await onSelectBuildProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectRun', async () => {
        await onSelectRunProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectDebugger', async () => {
        await onSelectDebuggerCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.resolveWithForceProbesExecution', async () => {
        await onResolveProjectWithForceProbesExecutionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.resolve', async () => {
        await onResolveProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.build', async () => {
        await onBuildProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.clean', async () => {
        await onCleanProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.install', async () => {
        await onInstallProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.cancel', async () => {
        await onCancelJobCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.getRunEnvironment', async () => {
        await onGetRunEnvironmentCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.run', async () => {
        await onRunProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.debug', async () => {
        await onDebugProductCommand(session);
    }));
}
