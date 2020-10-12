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

        let qbsAutoRestartRequired: boolean = false;
        session.onStatusChanged(status => {
            if (status === QbsSessionStatus.Stopped) {
                if (qbsAutoRestartRequired) {
                    qbsAutoRestartRequired = false;
                    vscode.commands.executeCommand('qbs.startSession');
                    resolve();
                }
            }
        });

        if (session.status === QbsSessionStatus.Started  || session.status === QbsSessionStatus.Starting) {
            qbsAutoRestartRequired = true;
            vscode.commands.executeCommand('qbs.stopSession');
            resolve();
        } else if (session.status === QbsSessionStatus.Stopping) {
            qbsAutoRestartRequired = true;
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
    }, async (progress) => {
        progress.report({ increment: 0 });
        await session.start();
        return new Promise(resolve => {
            session.onStatusChanged((status => {
                if (status === QbsSessionStatus.Starting) {
                    progress.report({ increment: 50, message: localize('qbs.session.starting.progress.message', 'Session starting...') });
                } else if (status === QbsSessionStatus.Started) {
                    progress.report({ increment: 100, message: localize('qbs.session.successfully.started.progress.message', 'Session successfully started.') });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                progress.report({ increment: 100, message: localize('qbs.session.starting.timeout.progress.message', 'Session starting timeout...') });
                resolve();
            }, 5000);
        });
    });
}

async function stopSession(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.session.status.progress.title', 'QBS session status')
    }, async (progress) => {
        progress.report({ increment: 0 });
        await session.stop();
        return new Promise(resolve => {
            session.onStatusChanged((status => {
                if (status === QbsSessionStatus.Stopping) {
                    progress.report({ increment: 50, message: localize('qbs.session.stopping.progress.message', 'Session stopping...') });
                } else if (status === QbsSessionStatus.Stopped) {
                    progress.report({ increment: 100, message: localize('qbs.session.successfully.stopped.progress.message', 'Session successfully stopped.') });
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                }
            }));

            setTimeout(() => {
                progress.report({ increment: 100, message: localize('qbs.session.stopping.timeout.progress.message', 'Session stopping timeout...') });
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
    await session.resolve();
}

async function build(session: QbsSession) {
    await session.build();
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
