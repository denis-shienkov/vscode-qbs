import { create } from 'domain';
import * as vscode from 'vscode';

import {QbsSession} from './qbssession';

let qbsSession: QbsSession|null = null;

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "qbs-tools" is now active!');

    //  Create the Qbs session.
    qbsSession = QbsSession.create(extensionContext);

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

    // Subscribe on session events.
    qbsSession.onProjectUrisEnumerated(function(uris) {
        console.log("Event happened: " + uris);
    });
}

export function deactivate() {}
