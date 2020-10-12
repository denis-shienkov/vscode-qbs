import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

// From user code.
import {QbsSession, QbsSessionStatus} from './qbssession';

import * as QbsSelectors from './qbsselectors';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

// Private functions.

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
        p.report({ increment: 0 });
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
        p.report({ increment: 0 });
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
        title: localize('qbs.session.resolve.progress.title', 'QBS project resolve')
    }, async (p) => {
        await session.resolve();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';

            const updateReport = () => {
                const percentage = (maxProgress > 0) ? ((100 * progress) / maxProgress) : 0;
                const msg = `${description} ${percentage} %`;
                p.report({ increment: percentage, message: msg});
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
                if (errors.isEmpty()) {
                    p.report({ message: localize('qbs.session.resolve.failed.progress.message',
                                                 'Project successfully resolved.') });
                } else {
                    p.report({ message: localize('qbs.session.resolve.successfully.progress.message',
                                                 'Project resolving failed.') });
                }
                setTimeout(() => {
                    resolve();
                }, 2000);
            });
        });
    });
}

async function build(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.build.progress.title', 'QBS project build')
    }, async (p) => {
        await session.build();
        return new Promise(resolve => {
            let maxProgress: number = 0;
            let progress: number = 0;
            let description: string = '';

            const updateReport = () => {
                const percentage = (maxProgress > 0) ? ((100 * progress) / maxProgress) : 0;
                const msg = `${description} ${percentage} %`;
                p.report({ increment: percentage, message: msg});
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
                if (errors.isEmpty()) {
                    p.report({ message: localize('qbs.session.build.failed.progress.message',
                                                 'Project successfully build.') });
                } else {
                    p.report({ message: localize('qbs.session.build.successfully.progress.message',
                                                 'Project building failed.') });
                }
                setTimeout(() => {
                    resolve();
                }, 2000);
            });
        });
    });
}

async function clean(session: QbsSession) {
    await session.clean();
}

// Public function.

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    // Start/stop session commands.
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.setupDefaultProject', () => {
        setupDefaultProject(session);
    }));
    // Start/stop session commands.
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.autoRestartSession', () => {
        autoRestartSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.startSession', () => {
        startSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.stopSession', () => {
        stopSession(session);
    }));
    // Session properties commands.
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProject', () => {
        selectProject(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectProfile', () => {
        selectProfile(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        selectConfiguration(session);
    }));
    // Session resolve/build/clean commands.
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.resolve', () => {
        resolve(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.build', () => {
        build(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('qbs.clean', () => {
        clean(session);
    }));
}
