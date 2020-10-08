import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { basename } from 'path'; 

// From user code.
import {QbsSession, QbsSessionStatus} from './qbssession';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class QbsStatusBar implements vscode.Disposable {
    // Private members.
    private _statusButton: vscode.StatusBarItem;
    private _projectButton: vscode.StatusBarItem;
    private _profileButton: vscode.StatusBarItem;
    private _configurationButton: vscode.StatusBarItem;

    // Constructors.
    constructor(private readonly _session: QbsSession) {
        // Create the QBS session status button.
        this._statusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
        this._statusButton.tooltip = localize('qbs.status.tooltip', 'QBS session status');
        this._statusButton.show();

        // Create the QBS project file selection button.
        this._projectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -2);
        this._projectButton.tooltip = localize('qbs.active.project.select.tooltip', 'Click to select the active project');
        this._projectButton.command = 'qbs.selectProject';
        this._projectButton.show();

        // Create the QBS build profile selection button.
        this._profileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -3);
        this._profileButton.tooltip = localize('qbs.build.profile.select.tooltip', 'Click to select the build profile');
        this._profileButton.command = 'qbs.selectProfile';
        this._profileButton.show();

        // Create the QBS build configuration selection button.
        this._configurationButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -4);
        this._configurationButton.tooltip = localize('qbs.build.configuration.select.tooltip', 'Click to select the build configuration');
        this._configurationButton.command = 'qbs.selectConfiguration';
        this._configurationButton.show();

        // Subscribe on the session events.
        _session.onStatusChanged(status => {
            this.updateSessionStatus(QbsUtils.sessionStatusName(this._session.status));
        });
        _session.onProjectUriChanged(uri => {
            this.updateProjectFileName(uri);
        });
        _session.onProfileNameChanged(name => {
            this.updateProfileName(name);
        });
        _session.onConfigurationNameChanged(name => {
            this.updateConfigurationName(name);
        });

        this.initialize();
    }

    // Public static methods.

    static create(session: QbsSession) {
        const statusbar = new QbsStatusBar(session);
        return statusbar;
    }

    // Public overriden methods.
    dispose(): void { }

    // Private methods.

    private async initialize() {
        await this.updateSessionStatus(QbsUtils.sessionStatusName(this._session.status));
        await this.updateProjectFileName();
        await this.updateProfileName();
        await this.updateConfigurationName();
    }

    private async updateSessionStatus(status: string) {
        this._statusButton.text = localize('qbs.session.status', `$(info) QBS: ${status}`);
    }

    private async updateProjectFileName(uri?: vscode.Uri) {
        const projectName = uri ? basename(uri.fsPath) : localize('qbs.active.project.empty', 'empty');
        this._projectButton.text = localize('qbs.active.project.select', `$(project) [${projectName}]`);
    }

    private async updateProfileName(profile?: string) {
        const profileName = profile ? profile : localize('qbs.active.profile.empty', 'none');
        this._profileButton.text = localize('qbs.build.profile.select', `$(tools) [${profileName}]`);
    }

    private async updateConfigurationName(configuration?: string) {
        const configurationName = configuration ? configuration : 'default';
        this._configurationButton.text = localize('qbs.build.configuration.select', `$(settings) [${configurationName}]`);
    }
}
