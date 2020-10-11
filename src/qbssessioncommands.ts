import * as vscode from 'vscode';

// From user code.
import {QbsSession} from './qbssession';

import * as QbsSelectors from './qbsselectors';

// Private functions.

async function startSession(session: QbsSession) {
    await session.start();
}

async function stopSession(session: QbsSession) {
    await session.stop();
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
