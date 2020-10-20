import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as path from 'path';

import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsProject} from './qbsproject';
import * as QbsSelectors from './qbsselectors';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

async function onSetupDefaultProjectCommand(session: QbsSession) {
    const projects = await QbsProject.enumerateWorkspaceProjects();
    if (projects.length > 0) {
        session.setActiveProject(projects[0]);
    }
}

async function onAutoRestartSessionCommand(session: QbsSession) {
    await new Promise<void>(resolve => {
        if (!QbsUtils.ensureQbsExecutableConfigured()) {
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        }

        let autoRestartRequired: boolean = false;
        session.onStatusChanged(sessionStatus => {
            if (sessionStatus === QbsSessionStatus.Stopped) {
                if (autoRestartRequired) {
                    autoRestartRequired = false;
                    vscode.commands.executeCommand('qbs.startSession');
                    resolve();
                }
            }
        });

        const sessionStatus = session.status();
        if (sessionStatus === QbsSessionStatus.Started
            || sessionStatus === QbsSessionStatus.Starting) {
            autoRestartRequired = true;
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        } else if (sessionStatus === QbsSessionStatus.Stopping) {
            autoRestartRequired = true;
        } else if (sessionStatus === QbsSessionStatus.Stopped) {
            vscode.commands.executeCommand('qbs.startSession');
            resolve();
        }
    });
}

async function onStartSessionCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.status.progress.title', 'QBS session status')
    }, async (p) => {
        await session.start();
        return new Promise(resolve => {
            session.onStatusChanged((status => {
                if (status === QbsSessionStatus.Starting) {
                    p.report({ 
                        increment: 50,
                        message: localize('qbs.session.starting.progress.message',
                                          'Session starting...')
                    });
                } else if (status === QbsSessionStatus.Started) {
                    p.report({
                        increment: 100,
                        message: localize('qbs.session.successfully.started.progress.message',
                                          'Session successfully started.')
                    });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                p.report({
                    message: localize('qbs.session.starting.timeout.progress.message',
                                      'Session starting timeout...')
                });
                resolve();
            }, 5000);
        });
    });
}

async function onStopSessionCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.status.progress.title', 'QBS session status')
    }, async (p) => {
        await session.stop();
        return new Promise(resolve => {
            session.onStatusChanged((sessionStatus => {
                if (sessionStatus === QbsSessionStatus.Stopping) {
                    p.report({
                        increment: 50,
                        message: localize('qbs.session.stopping.progress.message',
                                          'Session stopping...') 
                    });
                } else if (sessionStatus === QbsSessionStatus.Stopped) {
                    p.report({
                        increment: 100,
                        message: localize('qbs.session.successfully.stopped.progress.message',
                                          'Session successfully stopped.')
                    });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                p.report({
                    message: localize('qbs.session.stopping.timeout.progress.message',
                                      'Session stopping timeout...')
                });
                resolve();
            }, 5000);
        });
    });
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

async function onResolveProjectCommand(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.resolve.progress.title', 'Project resolving'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.resolveProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
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

            session.onTaskStarted(result => {
                description = result._description;
                maxProgress = result._maxProgress;
                progress = 0;
                updateReport();
            });
            session.onTaskMaxProgressChanged(result => {
                maxProgress = result._maxProgress;
                updateReport();
            });
            session.onTaskProgressUpdated(result => {
                progress = result._progress;
                updateReport();
            });
            session.onProjectResolved(errors => {
                description = errors.isEmpty() ? 'Project successfully resolved'
                                               : 'Project resolving failed';
                updateReport(false);
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
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.buildProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
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

            session.onTaskStarted(result => {
                description = result._description;
                maxProgress = result._maxProgress;
                progress = 0;
                updateReport();
            });
            session.onTaskMaxProgressChanged(result => {
                maxProgress = result._maxProgress;
                updateReport();
            });
            session.onTaskProgressUpdated(result => {
                progress = result._progress;
                updateReport();
            });
            session.onProjectBuilt(errors => {
                maxProgress = progress = oldPercentage = 0;
                description = errors.isEmpty() ? 'Project successfully built'
                                               : 'Project building failed';
                updateReport(false);
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
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.cleanProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
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

            session.onTaskStarted(result => {
                description = result._description;
                maxProgress = result._maxProgress;
                progress = 0;
                updateReport();
            });
            session.onTaskMaxProgressChanged(result => {
                maxProgress = result._maxProgress;
                updateReport();
            });
            session.onTaskProgressUpdated(result => {
                progress = result._progress;
                updateReport();
            });
            session.onProjectCleaned(errors => {
                description = errors.isEmpty() ? 'Project successfully cleaned'
                                               : 'Project cleaning failed';
                updateReport(false);
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
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.installProject();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
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

            session.onTaskStarted(result => {
                description = result._description;
                maxProgress = result._maxProgress;
                progress = 0;
                updateReport();
            });
            session.onTaskMaxProgressChanged(result => {
                maxProgress = result._maxProgress;
                updateReport();
            });
            session.onTaskProgressUpdated(result => {
                progress = result._progress;
                updateReport();
            });
            session.onProjectInstalled(errors => {
                description = errors.isEmpty() ? 'Project successfully installed'
                                               : 'Project installing failed';
                updateReport(false);
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

    await new Promise<void>((resolve, reject) => {
        session.onRunEnvironmentResultReceived(result => {
            if (!result.isEmpty()) {
                reject(undefined);
            } else {
                resolve();
            }
        });
        session.getRunEnvironment();
    });

    const runStep = session.project()?.runStep();
    const env = runStep?.runEnvironment()?.data();
    const executable = runStep?.targetExecutable();
    if (!executable || !env) {
        return;
    } else {
        const escaped = QbsUtils.escapeShell(executable);
        const terminal = vscode.window.createTerminal({
            name: 'QBS Run',
            env: env,
            cwd: path.dirname(executable)
        });
        terminal.sendText(escaped);
        terminal.show();
    }
}

async function onDebugProductCommand(session: QbsSession) {
    // TODO: Implement me
    console.debug("*** debugging requested");
}

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.setupDefaultProject', () => {
        onSetupDefaultProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.autoRestartSession', () => {
        onAutoRestartSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.startSession', () => {
        onStartSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.stopSession', () => {
        onStopSessionCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProject', () => {
        onSelectProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProfile', () => {
        onSelectProfileCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        onSelectConfigurationCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectBuild', () => {
        onSelectBuildProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectRun', () => {
        onSelectRunProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectDebugger', () => {
        onSelectDebuggerCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.resolve', () => {
        onResolveProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.build', () => {
        onBuildProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.clean', () => {
        onCleanProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.install', () => {
        onInstallProjectCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.cancel', () => {
        onCancelJobCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.getRunEnvironment', () => {
        onGetRunEnvironmentCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.run', () => {
        onRunProductCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.debug', () => {
        onDebugProductCommand(session);
    }));
}
