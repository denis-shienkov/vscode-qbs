import * as vscode from 'vscode';

import {QbsSessionLogger} from './qbssessionlogger';
import {QbsSession, QbsSessionStatus} from './qbssession';
import {QbsStatusBar} from './qbsstatusbar';
import {QbsCppConfigurationProvider} from './qbscppconfigprovider';
import * as QbsSessionCommands from './qbssessioncommands';

let manager: QbsExtensionManager;

class QbsExtensionManager implements vscode.Disposable {
    private _session: QbsSession = new QbsSession();
    private _statusBar: QbsStatusBar = new QbsStatusBar(this._session);
    private _logger: QbsSessionLogger = new QbsSessionLogger(this._session);
    private _cpp: QbsCppConfigurationProvider = new QbsCppConfigurationProvider(this._session);
    private _autoResolveRequired: boolean = false;

    constructor(readonly ctx: vscode.ExtensionContext) {
        QbsSessionCommands.subscribeCommands(ctx, this._session);
        this.subscribeWorkspaceConfigurationEvents(ctx);
        this.subscribeSessionEvents(ctx);

        vscode.commands.executeCommand('qbs.setupDefaultProject');
        vscode.commands.executeCommand('qbs.autoRestartSession');
    }

    dispose() {
        this._cpp.dispose();
        this._logger.dispose();
        this._statusBar.dispose();
        this._session.dispose();
    }

    private autoResolveProject = () => {
        if (this._autoResolveRequired
            && this._session.status === QbsSessionStatus.Started
            && this._session.projectUri) {
            this._autoResolveRequired = false;
            vscode.commands.executeCommand('qbs.resolve');
        }
    }

    private subscribeWorkspaceConfigurationEvents(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('qbs.qbsPath')) {
                vscode.commands.executeCommand('qbs.autoRestartSession');
            }
            if (e.affectsConfiguration('qbs.forceProbes')) {
                this._autoResolveRequired = true;
                this.autoResolveProject();
            }
            if (e.affectsConfiguration('qbs.errorHandlingMode')) {
                this._autoResolveRequired = true;
                this.autoResolveProject();
            }
            if (e.affectsConfiguration('qbs.logLevel')) {
                this._autoResolveRequired = true;
                this.autoResolveProject();
            }
        }));
    }

    private subscribeSessionEvents(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(this._session.onStatusChanged(status => {
            if (status === QbsSessionStatus.Started) {
                this.autoResolveProject();
            }
        }));
        ctx.subscriptions.push(this._session.onProjectUriChanged(uri => {
            this._autoResolveRequired = true;
            this.autoResolveProject();
        }));
        ctx.subscriptions.push(this._session.onProfileNameChanged(name => {
            this._autoResolveRequired = true;
            this.autoResolveProject();
        }));
        ctx.subscriptions.push(this._session.onConfigurationNameChanged(name => {
            this._autoResolveRequired = true;
            this.autoResolveProject();
        }));
    }
}

export async function activate(ctx: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');

    manager = new QbsExtensionManager(ctx);
}

export async function deactivate() {
    manager.dispose();
}
