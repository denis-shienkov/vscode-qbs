import * as vscode from 'vscode';

// From user code.
import {QbsSession} from './qbssession';

import * as QbsSelectors from './qbsselectors';

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    const startSessionCmd = vscode.commands.registerCommand('qbs.startSession', () => {
        session!.start();
    });
    ctx.subscriptions.push(startSessionCmd);

    const stopSessionCmd = vscode.commands.registerCommand('qbs.stopSession', () => {
        session!.stop();
    });
    ctx.subscriptions.push(stopSessionCmd);

    const selectProjectCmd = vscode.commands.registerCommand('qbs.selectProject', () => {
        QbsSelectors.selectProject().then(projectUri => {
            if (projectUri)
            session!.projectUri = projectUri;
        });
    });
    ctx.subscriptions.push(selectProjectCmd);

    const selectProfileCmd = vscode.commands.registerCommand('qbs.selectProfile', () => {
        QbsSelectors.selectProfile().then(profileName => {
            if (profileName)
                session!.profileName = profileName;
        });
    });
    ctx.subscriptions.push(selectProfileCmd);

    const selectConfigurationCmd = vscode.commands.registerCommand('qbs.selectConfiguration', () => {
        QbsSelectors.selectConfiguration().then(configurationName => {
             if (configurationName)
             session!.configurationName = configurationName;
        });
    });
    ctx.subscriptions.push(selectConfigurationCmd);

    const resolveCmd = vscode.commands.registerCommand('qbs.resolve', () => {
        session!.resolve();
    });
    ctx.subscriptions.push(resolveCmd);

    const buildCmd = vscode.commands.registerCommand('qbs.build', () => {
        session!.build();
    });
    ctx.subscriptions.push(buildCmd);

    const cleanCmd = vscode.commands.registerCommand('qbs.clean', () => {
        session!.clean();
    });
    ctx.subscriptions.push(cleanCmd);
}
