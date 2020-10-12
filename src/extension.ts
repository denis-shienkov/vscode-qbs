import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

// From user code.
import {QbsSessionLogger} from './qbssessionlogger';
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsSessionCommands from './qbssessioncommands';

let logger!: QbsSessionLogger;
let session!: QbsSession;
let statusBar!: QbsStatusBar;
let autoResolveRequired: boolean = false;

async function subscribeWorkspaceConfigurationEvents(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('qbs.qbsPath')) {
            vscode.commands.executeCommand('qbs.autoRestartSession');
        }
    }));
}

async function subscribeSessionEvents(ctx: vscode.ExtensionContext) {
    // QBS session status.
    ctx.subscriptions.push(session.onStatusChanged(status => {
        if (status === QbsSessionStatus.Started) {
            autoResolveProject();
        }
    }));
    // QBS session configuration.
    ctx.subscriptions.push(session.onProjectUriChanged(uri => {
        autoResolveRequired = true;
        autoResolveProject();
    }));
    ctx.subscriptions.push(session.onProfileNameChanged(name => {
        autoResolveRequired = true;
        autoResolveProject();
    }));
    ctx.subscriptions.push(session.onConfigurationNameChanged(name => {
        autoResolveRequired = true;
        autoResolveProject();
    }));
}

async function autoResolveProject() {
    if (autoResolveRequired && session?.status === QbsSessionStatus.Started && session?.projectUri) {
        autoResolveRequired = false;
        vscode.commands.executeCommand('qbs.resolve');
    }
}

export async function activate(ctx: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    // Create all required singletons.
    session = new QbsSession(ctx);
    statusBar = new QbsStatusBar(session);
    logger = new QbsSessionLogger(ctx, session);

    // Subscribe to all required events.
    await QbsSessionCommands.subscribeCommands(ctx, session);
    await subscribeWorkspaceConfigurationEvents(ctx);
    await subscribeSessionEvents(ctx);

    await vscode.commands.executeCommand('qbs.setupDefaultProject');
    await vscode.commands.executeCommand('qbs.autoRestartSession');
}

export async function deactivate() {
    statusBar.dispose();
    session.dispose();
    logger.dispose();
}
