import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

// From user code.
import {QbsSessionLogger} from './qbssessionlogger';
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsCommands from './qbssessioncommands';

let qbsSessionLogger!: QbsSessionLogger;
let qbsSession!: QbsSession;
let qbsStatusBar!: QbsStatusBar;
let qbsAutoResolveRequired: boolean = false;

async function subscribeWorkspaceConfigurationEvents(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('qbs.qbsPath')) {
            vscode.commands.executeCommand('qbs.autoRestartSession');
        }
    }));
}

async function subscribeSessionEvents(ctx: vscode.ExtensionContext) {
    // QBS session status.
    ctx.subscriptions.push(qbsSession.onStatusChanged(status => {
        if (status === QbsSessionStatus.Started) {
            autoResolveProject();
        }
    }));
    // QBS session configuration.
    ctx.subscriptions.push(qbsSession.onProjectUriChanged(uri => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    ctx.subscriptions.push(qbsSession.onProfileNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    ctx.subscriptions.push(qbsSession.onConfigurationNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    // QBS session logging.
    ctx.subscriptions.push(qbsSession.onTaskStarted(result => {
        qbsSessionLogger.handleTaskStarted(result);
    }));
    ctx.subscriptions.push(qbsSession.onProjectResolved(result => {
        qbsSessionLogger.handleProjectResolved(result);
    }));
    ctx.subscriptions.push(qbsSession.onProjectBuilt(result => {
        qbsSessionLogger.handleProjectBuilt(result);
    }));
    ctx.subscriptions.push(qbsSession.onProjectCleaned(result => {
        qbsSessionLogger.handleProjectCleaned(result);
    }));
    ctx.subscriptions.push(qbsSession.onProjectInstalled(result => {
        qbsSessionLogger.handleProjectInstalled(result);
    }));
    ctx.subscriptions.push(qbsSession.onCommandDescriptionReceived(result => {
        qbsSessionLogger.handleCommandDesctiptionReceived(result);
    }));
    ctx.subscriptions.push(qbsSession.onProcessResultReceived(result => {
        qbsSessionLogger.handleProcessResultReceived(result);
    }));
    ctx.subscriptions.push(qbsSession.onLogMessageReceived(result => {
        qbsSessionLogger.handleMessageReceived(result);
    }));
}

async function autoResolveProject() {
    if (qbsAutoResolveRequired && qbsSession?.status === QbsSessionStatus.Started && qbsSession?.projectUri) {
        qbsAutoResolveRequired = false;
        vscode.commands.executeCommand('qbs.resolve');
    }
}

export async function activate(ctx: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    // Create all required singletons.
    qbsSessionLogger = new QbsSessionLogger(ctx);
    qbsSession = new QbsSession(ctx);
    qbsStatusBar = new QbsStatusBar(qbsSession);

    // Subscribe to all required events.
    await QbsCommands.subscribeCommands(ctx, qbsSession);
    await subscribeWorkspaceConfigurationEvents(ctx);
    await subscribeSessionEvents(ctx);

    await vscode.commands.executeCommand('qbs.setupDefaultProject');
    await vscode.commands.executeCommand('qbs.autoRestartSession');
}

export async function deactivate() {
    qbsStatusBar?.dispose();
    qbsSession?.dispose();
}
