import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as fs from 'fs';

// From user code.
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsSelectors from './qbsselectors';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

let qbsSession: QbsSession|null = null;
let qbsStatusBar: QbsStatusBar|null = null;
let qbsAutoResolveRequired: boolean = false;
let qbsAutoRestartRequired: boolean = false;

function subscribeCommands(extensionContext: vscode.ExtensionContext) {
    const startSessionCmd = vscode.commands.registerCommand('qbs.startSession', () => {
         qbsSession!.start();
    });
    extensionContext.subscriptions.push(startSessionCmd);

    const stopSessionCmd = vscode.commands.registerCommand('qbs.stopSession', () => {
        qbsSession!.stop();
    });
    extensionContext.subscriptions.push(stopSessionCmd);

    const selectProjectCmd = vscode.commands.registerCommand('qbs.selectProject', () => {
        QbsSelectors.selectProject().then(projectUri => {
            if (projectUri)
                qbsSession!.projectUri = projectUri;
        });
    });
    extensionContext.subscriptions.push(selectProjectCmd);

    const selectProfileCmd = vscode.commands.registerCommand('qbs.selectProfile', () => {
        QbsSelectors.selectProfile().then(profileName => {
            if (profileName)
                qbsSession!.profileName = profileName;
        });
    });
    extensionContext.subscriptions.push(selectProfileCmd);

    const selectConfigurationCmd = vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        QbsSelectors.selectConfiguration().then(configurationName => {
             if (configurationName)
                qbsSession!.configurationName = configurationName;
        });
    });
    extensionContext.subscriptions.push(selectConfigurationCmd);

    const resolveCmd = vscode.commands.registerCommand('qbs.resolve', () => {
        qbsSession!.resolve();
    });
    extensionContext.subscriptions.push(resolveCmd);

    const buildCmd = vscode.commands.registerCommand('qbs.build', () => {
        qbsSession!.build();
    });
    extensionContext.subscriptions.push(buildCmd);

    const cleanCmd = vscode.commands.registerCommand('qbs.clean', () => {
        qbsSession!.clean();
    });
    extensionContext.subscriptions.push(cleanCmd);
}

function subscribeWorkspaceConfigurationEvents(extensionContext: vscode.ExtensionContext) {
    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('qbs.qbsPath')) {
            autoRestartSession();
        }
    }));
}

function subscribeSessionEvents(extensionContext: vscode.ExtensionContext, session: QbsSession) {
    extensionContext.subscriptions.push(session.onStatusChanged(status => {
        showSessionStatusMessage(status);

        if (status === QbsSessionStatus.Started) {
            autoResolveProject();
        } else if (status === QbsSessionStatus.Stopped) {
            if (qbsAutoRestartRequired) {
                qbsAutoRestartRequired = false;
                session.start();
            }
        }
    }));
    extensionContext.subscriptions.push(session.onProjectUriChanged(uri => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    extensionContext.subscriptions.push(session.onProfileNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    extensionContext.subscriptions.push(session.onConfigurationNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
}

async function showSessionStatusMessage(status: QbsSessionStatus) {
    const statusName = QbsUtils.sessionStatusName(status);
    await vscode.window.showInformationMessage(localize('qbs.status.info.message',
                                                        `QBS status: ${statusName}`));
}

async function ensureQbsExecutableConfigured(): Promise<boolean> {
    const qbsPath = await QbsUtils.fetchQbsPath();
    if (!qbsPath) {
        vscode.window.showErrorMessage(localize('qbs.executable.missed.error.message',
                                                'QBS executable not set in configuration.'));
        return false;
    } else if (!fs.existsSync(qbsPath)) {
        vscode.window.showErrorMessage(localize('qbs.executable.not-found.error.message',
                                                `QBS executable ${qbsPath} not found.`));
        return false;
    }
    vscode.window.showInformationMessage(localize('qbs.executable.found.info.message',
                                                  `QBS executable found in ${qbsPath}.`));
    return true;
}

async function autoResolveProject() {
    if (qbsAutoResolveRequired && qbsSession?.status === QbsSessionStatus.Started && qbsSession?.projectUri) {
        qbsAutoResolveRequired = false;
        await qbsSession.resolve();
    }
}

async function autoRestartSession() {
    if (!await ensureQbsExecutableConfigured()) {
        await qbsSession?.stop();
        return;
    }

    if (qbsSession?.status === QbsSessionStatus.Started
        || qbsSession?.status === QbsSessionStatus.Starting) {
            qbsAutoRestartRequired = true;
            await qbsSession.stop();
    } else if (qbsSession?.status === QbsSessionStatus.Stopping) {
        qbsAutoRestartRequired = true;
    } else if (qbsSession?.status === QbsSessionStatus.Stopped) {
        await qbsSession.start();
    }
}

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    // Create all required singletons.
    qbsSession = new QbsSession(extensionContext);
    qbsStatusBar = new QbsStatusBar(qbsSession);

    // Subscribe to all required events.
    subscribeCommands(extensionContext);
    subscribeWorkspaceConfigurationEvents(extensionContext);
    subscribeSessionEvents(extensionContext, qbsSession);

    autoRestartSession();
}

export function deactivate() {}
