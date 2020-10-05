import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { basename } from 'path'; 

import {QbsSession, QbsSessionStatus} from './qbssession';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class StatusBar implements vscode.Disposable {
    // Private members.
    private _statusButton: vscode.StatusBarItem;
    private _projectFileButton: vscode.StatusBarItem;

    // Constructors.
    constructor(private readonly _session: QbsSession) {
        // Create the QBS session status button.
        this._statusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._statusButton.tooltip = localize('qbs.active.project.select.tooltip', 'QBS session status');
        this._statusButton.show();

        // Create the QBS project file selection button.
        this._projectFileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._projectFileButton.tooltip = localize('qbs.active.project.select.tooltip', 'Click to select the active project');
        this._projectFileButton.command = 'qbs.selectProject';
        this._projectFileButton.show();

        // Subscribe on the session events.
        _session.onProjectUriChanged(uri => {
            this.updateProjectName(uri);
        });
        _session.onStatusChanged(status => {
            this.updateSessionStatus(StatusBar.sessionStatusName(this._session.status));
        });

        this.initialize();
    }

    // Public static methods.

    static create(session: QbsSession) {
        const statusbar = new StatusBar(session);
        return statusbar;
    }

    // Public overriden methods.
    dispose(): void { }

    // Private static methods.

    private static sessionStatusName(status: QbsSessionStatus) {
        switch (status) {
        case QbsSessionStatus.Started:
            return localize('qbs.session.status.started', `started`);
        case QbsSessionStatus.Starting:
            return localize('qbs.session.status.starting', `starting`);
        case QbsSessionStatus.Stopped:
            return localize('qbs.session.status.stopped', `stopped`);
        case QbsSessionStatus.Stopping:
            return localize('qbs.session.status.stopping', `stopping`);
        }
    }

    // Private methods.

    private async initialize() {
        await this.updateSessionStatus(StatusBar.sessionStatusName(this._session.status));
        await this.updateProjectName();
    }

    private async updateSessionStatus(status: string) {
        this._statusButton.text = localize('qbs.session.status', `QBS (${status})`);
    }

    private async updateProjectName(uri?: vscode.Uri) {
        const projectName = uri ? basename(uri.fsPath) : localize('qbs.active.project.empty', 'empty');
        this._projectFileButton.text = localize('qbs.active.project.select', '$(project) Project (' + projectName + ')');
    }
}
