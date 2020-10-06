import * as vscode from 'vscode';

// From user code.
import {QbsSession} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsSelectors from './qbsselectors';

let qbsSession: QbsSession|null = null;
let qbsStatusBar: QbsStatusBar|null = null;

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    qbsSession = QbsSession.create(extensionContext);
    qbsStatusBar = QbsStatusBar.create(qbsSession);

    const selectProjectCmd = vscode.commands.registerCommand('qbs.selectProject', () => {
        QbsSelectors.selectProject().then(projectUri => {
            console.debug('qbs: selectProject: ' + projectUri);
            if (projectUri && qbsSession)
                qbsSession.projectUri = projectUri;
        });
    });
    extensionContext.subscriptions.push(selectProjectCmd);

    const selectProfileCmd = vscode.commands.registerCommand('qbs.selectProfile', () => {
        QbsSelectors.selectProfile().then(profileName => {
            console.debug('qbs: selectProfile: ' + profileName);
            if (profileName && qbsSession)
                qbsSession.profileName = profileName;
        });
    });
    extensionContext.subscriptions.push(selectProfileCmd);

    const selectConfigurationCmd = vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        QbsSelectors.selectConfiguration().then(configurationName => {
            console.debug('qbs: selectConfiguration: ' + configurationName);
            if (configurationName && qbsSession)
                qbsSession.configurationName = configurationName;
        });
    });
    extensionContext.subscriptions.push(selectConfigurationCmd);

    const configureCmd = vscode.commands.registerCommand('qbs.configure', () => {
        vscode.window.showInformationMessage('QBS: configure');
    });
    extensionContext.subscriptions.push(configureCmd);

    const buildCmd = vscode.commands.registerCommand('qbs.build', () => {
        vscode.window.showInformationMessage('QBS: build');
    });
    extensionContext.subscriptions.push(buildCmd);

    const cleanCmd = vscode.commands.registerCommand('qbs.clean', () => {
        vscode.window.showInformationMessage('QBS: clean');
    });
    extensionContext.subscriptions.push(cleanCmd);
}

export function deactivate() {}
