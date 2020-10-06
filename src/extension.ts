import * as vscode from 'vscode';
import { basename } from 'path';

// From user code.
import * as QbsUtils from './qbsutils';
import {QbsSession} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';

let qbsSession: QbsSession|null = null;
let qbsStatusBar: QbsStatusBar|null = null;

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    qbsSession = QbsSession.create(extensionContext);
    qbsStatusBar = QbsStatusBar.create(qbsSession);

    const selectProjectCmd = vscode.commands.registerCommand('qbs.selectProject', () => {
        selectProject().then(projectUri => {
            console.debug('qbs: selectProject: ' + projectUri);
            if (projectUri && qbsSession)
                qbsSession.projectUri = projectUri;
        });
    });
    extensionContext.subscriptions.push(selectProjectCmd);

    const selectProfileCmd = vscode.commands.registerCommand('qbs.selectProfile', () => {
        selectProfile().then(profileName => {
            console.debug('qbs: selectProfile: ' + profileName);
            if (profileName && qbsSession)
                qbsSession.profileName = profileName;
        });
    });
    extensionContext.subscriptions.push(selectProfileCmd);

    const selectConfigurationCmd = vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        selectConfiguration().then(configurationName => {
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

async function selectProject(): Promise<vscode.Uri | undefined> {
    interface ProjectQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
    }
    const projects = await QbsUtils.enumerateProjects();
    const items: ProjectQuickPickItem[] = projects.map(project => {
        return {
            label: basename(project.fsPath),
            uri: project
        };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item ? item.uri : undefined;
    });
}

async function selectProfile(): Promise<string | undefined> {
    const profiles = await QbsUtils.enumerateBuildProfiles();
    const items: vscode.QuickPickItem[] = profiles.map(profile => {
        return { label: profile };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item ? item.label : undefined;
    });
}

async function selectConfiguration(): Promise<string | undefined> {
    const configurations = await QbsUtils.enumerateBuildConfigurations();
    const items: vscode.QuickPickItem[] = configurations.map(configuration => {
        return { label: configuration };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item ? item.label : undefined;
    });
}
