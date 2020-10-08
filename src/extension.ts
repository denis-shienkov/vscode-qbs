import * as vscode from 'vscode';

// From user code.
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsSelectors from './qbsselectors';

let qbsSession: QbsSession|null = null;
let qbsStatusBar: QbsStatusBar|null = null;
let qbsAutoResolveRequired: boolean = false;

function registerCommands(extensionContext: vscode.ExtensionContext) {
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

function autoResolveProject() {
    if (qbsAutoResolveRequired && qbsSession?.status === QbsSessionStatus.Started && qbsSession?.projectUri) {
        qbsAutoResolveRequired = false;
        qbsSession.resolve();
    }
}

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');
    // Create the QBS objects.
    qbsSession = QbsSession.create(extensionContext);
    qbsStatusBar = QbsStatusBar.create(qbsSession);
    // Register the QBS commands.
    registerCommands(extensionContext);

    qbsSession.onStatusChanged(status => {
        if (status === QbsSessionStatus.Started) {
            autoResolveProject();
        }
    });
    qbsSession.onProjectUriChanged(uri => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    });
    qbsSession.onProfileNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    });
    qbsSession.onConfigurationNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    });
}

export function deactivate() {}
