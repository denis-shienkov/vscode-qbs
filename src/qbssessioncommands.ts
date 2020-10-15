import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession, QbsSessionStatus} from './qbssession';
import * as QbsSelectors from './qbsselectors';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

async function setupDefaultProject(session: QbsSession) {
    const projects = await QbsUtils.enumerateProjects();
    if (projects.length) {
        session.projectUri = projects[0];
    }
}

async function autoRestartSession(session: QbsSession) {
    await new Promise<void>(resolve => {
        if (!QbsUtils.ensureQbsExecutableConfigured()) {
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        }

        let autoRestartRequired: boolean = false;
        session.onStatusChanged(status => {
            if (status === QbsSessionStatus.Stopped) {
                if (autoRestartRequired) {
                    autoRestartRequired = false;
                    vscode.commands.executeCommand('qbs.startSession');
                    resolve();
                }
            }
        });

        if (session.status === QbsSessionStatus.Started  || session.status === QbsSessionStatus.Starting) {
            autoRestartRequired = true;
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        } else if (session.status === QbsSessionStatus.Stopping) {
            autoRestartRequired = true;
        } else if (session.status === QbsSessionStatus.Stopped) {
            vscode.commands.executeCommand('qbs.startSession');
            resolve();
        }
    });
}

async function startSession(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.status.progress.title', 'QBS session status')
    }, async (p) => {
        await session.start();
        return new Promise(resolve => {
            session.onStatusChanged((status => {
                if (status === QbsSessionStatus.Starting) {
                    p.report({ increment: 50, message: localize('qbs.session.starting.progress.message',
                                                                'Session starting...') });
                } else if (status === QbsSessionStatus.Started) {
                    p.report({ increment: 100, message: localize('qbs.session.successfully.started.progress.message',
                                                                 'Session successfully started.') });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                p.report({ message: localize('qbs.session.starting.timeout.progress.message',
                                             'Session starting timeout...') });
                resolve();
            }, 5000);
        });
    });
}

async function stopSession(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.status.progress.title', 'QBS session status')
    }, async (p) => {
        await session.stop();
        return new Promise(resolve => {
            session.onStatusChanged((status => {
                if (status === QbsSessionStatus.Stopping) {
                    p.report({ increment: 50, message: localize('qbs.session.stopping.progress.message',
                                                                'Session stopping...') });
                } else if (status === QbsSessionStatus.Stopped) {
                    p.report({ increment: 100, message: localize('qbs.session.successfully.stopped.progress.message',
                                                                 'Session successfully stopped.') });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                p.report({ message: localize('qbs.session.stopping.timeout.progress.message',
                                             'Session stopping timeout...') });
                resolve();
            }, 5000);
        });
    });
}

async function selectProject(session: QbsSession) {
    await QbsSelectors.selectProject().then(projectUri => {
        if (projectUri) {
            session.projectUri = projectUri;
        }
    });
}

async function selectProfile(session: QbsSession) {
    await QbsSelectors.selectProfile().then(profileName => {
        if (profileName) {
            session.profileName = profileName;
        }
    });
}

async function selectConfiguration(session: QbsSession) {
    await QbsSelectors.selectConfiguration().then(configurationName => {
        if (configurationName) {
            session.configurationName = configurationName;
        }
   });
}

async function resolve(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.resolve.progress.title', 'Project resolving'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.resolve();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
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

async function build(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.build.progress.title', 'Project building'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.build();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
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

async function clean(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.clean.progress.title', 'Project cleaning'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.clean();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
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

async function install(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.install.progress.title', 'Project installing'),
        cancellable: true
    }, async (p, c) => {
        c.onCancellationRequested(() => vscode.commands.executeCommand('qbs.cancel'));
        await session.install();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';
            let oldPercentage: number = 0;

            const updateReport = (showPercentage: boolean = true) => {
                if (showPercentage) {
                    const newPercentage = (progress > 0) ? Math.round((100 * progress) / maxProgress) : 0;
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

async function cancel(session: QbsSession) {
    await session.cancel();
}

async function fetchRunEnvironment(session: QbsSession) {
    await session.fetchRunEnvironment();
}

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.setupDefaultProject', () => {
        setupDefaultProject(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.autoRestartSession', () => {
        autoRestartSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.startSession', () => {
        startSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.stopSession', () => {
        stopSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProject', () => {
        selectProject(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProfile', () => {
        selectProfile(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        selectConfiguration(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.resolve', () => {
        resolve(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.build', () => {
        build(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.clean', () => {
        clean(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.install', () => {
        install(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.cancel', () => {
        cancel(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.getRunEnvironment', () => {
        fetchRunEnvironment(session);
    }));
}
