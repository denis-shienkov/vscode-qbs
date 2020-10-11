import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

// From user code.
import {QbsSessionLogger} from './qbssessionlogger';
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import * as QbsUtils from './qbsutils';
import * as QbsCommands from './qbssessioncommands';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

let qbsSessionLogger!: QbsSessionLogger;
let qbsSession!: QbsSession;
let qbsStatusBar!: QbsStatusBar;
let qbsAutoResolveRequired: boolean = false;

async function subscribeWorkspaceConfigurationEvents(extensionContext: vscode.ExtensionContext) {
    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('qbs.qbsPath')) {
            vscode.commands.executeCommand('qbs.autoRestartSession');
        }
    }));
}

async function subscribeSessionEvents(extensionContext: vscode.ExtensionContext) {
    // QBS session status.
    extensionContext.subscriptions.push(qbsSession.onStatusChanged(status => {
        if (status === QbsSessionStatus.Started) {
            autoResolveProject();
        }
    }));
    // QBS session configuration.
    extensionContext.subscriptions.push(qbsSession.onProjectUriChanged(uri => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    extensionContext.subscriptions.push(qbsSession.onProfileNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    extensionContext.subscriptions.push(qbsSession.onConfigurationNameChanged(name => {
        qbsAutoResolveRequired = true;
        autoResolveProject();
    }));
    // QBS session logging.
    extensionContext.subscriptions.push(qbsSession.onTaskStarted(result => {
        qbsSessionLogger.handleTaskStarted(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onProjectResolved(result => {
        qbsSessionLogger.handleProjectResolved(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onProjectBuilt(result => {
        qbsSessionLogger.handleProjectBuilt(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onProjectCleaned(result => {
        qbsSessionLogger.handleProjectCleaned(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onProjectInstalled(result => {
        qbsSessionLogger.handleProjectInstalled(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onCommandDescriptionReceived(result => {
        qbsSessionLogger.handleCommandDesctiptionReceived(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onProcessResultReceived(result => {
        qbsSessionLogger.handleProcessResultReceived(result);
    }));
    extensionContext.subscriptions.push(qbsSession.onLogMessageReceived(result => {
        qbsSessionLogger.handleMessageReceived(result);
    }));
}

async function autoResolveProject() {
    if (qbsAutoResolveRequired && qbsSession?.status === QbsSessionStatus.Started && qbsSession?.projectUri) {
        qbsAutoResolveRequired = false;
        vscode.commands.executeCommand('qbs.resolve');
    }
}

async function setupDefaultProject() {
    const projects = await QbsUtils.enumerateProjects();
    if (projects.length) {
        qbsSession.projectUri = projects[0];
    }
}

export async function activate(extensionContext: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    // Create all required singletons.
    qbsSessionLogger = new QbsSessionLogger(extensionContext);
    qbsSession = new QbsSession(extensionContext);
    qbsStatusBar = new QbsStatusBar(qbsSession);

    // Subscribe to all required events.
    await QbsCommands.subscribeCommands(extensionContext, qbsSession);
    await subscribeWorkspaceConfigurationEvents(extensionContext);
    await subscribeSessionEvents(extensionContext);

    await setupDefaultProject();
    vscode.commands.executeCommand('qbs.autoRestartSession');
}

export async function deactivate() {
    qbsStatusBar?.dispose();
    qbsSession?.dispose();
}
