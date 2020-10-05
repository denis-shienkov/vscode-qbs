import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { basename } from 'path'; 

import {QbsSession, QbsSessionStatus} from './qbssession';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class StatusBar implements vscode.Disposable {
    // Private members.
    private _statusButton: vscode.StatusBarItem;
    private _projectButton: vscode.StatusBarItem;
    private _profileButton: vscode.StatusBarItem;

    // Constructors.
    constructor(private readonly _session: QbsSession) {
        // Create the QBS session status button.
        this._statusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._statusButton.tooltip = localize('qbs.active.project.select.tooltip', 'QBS session status');
        this._statusButton.show();

        // Create the QBS project file selection button.
        this._projectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._projectButton.tooltip = localize('qbs.active.project.select.tooltip', 'Click to select the active project');
        this._projectButton.command = 'qbs.selectProject';
        this._projectButton.show();

        // Create the QBS profile selection button.
        this._profileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._profileButton.tooltip = localize('qbs.active.profile.select.tooltip', 'Click to select the profile');
        this._profileButton.command = 'qbs.selectProfile';
        this._profileButton.show();

        // Subscribe on the session events.
        _session.onStatusChanged(status => {
            this.updateSessionStatus(StatusBar.sessionStatusName(this._session.status));
        });
        _session.onProjectUriChanged(uri => {
            this.updateProjectFileName(uri);
        });
        _session.onProfileNameChanged(name => {
            this.updateProfileName(name);
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
        await this.updateProjectFileName();
        await this.updateProfileName();
    }

    private async updateSessionStatus(status: string) {
        this._statusButton.text = localize('qbs.session.status', `QBS (${status})`);
    }

    private async updateProjectFileName(uri?: vscode.Uri) {
        const projectName = uri ? basename(uri.fsPath) : localize('qbs.active.project.empty', 'empty');
        this._projectButton.text = localize('qbs.active.project.select', '$(project) Project (' + projectName + ')');
    }

    private async updateProfileName(profile?: string) {
        const profileName = profile ? profile : localize('qbs.active.profile.empty', 'empty');
        this._profileButton.text = localize('qbs.active.profile.select', `$(settings) Profile (${profileName})`);
    }
}
