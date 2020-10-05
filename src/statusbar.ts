import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { basename } from 'path'; 

import {QbsSession} from './qbssession';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class StatusBar implements vscode.Disposable {
    // Private members.
    private _projectFileButton: vscode.StatusBarItem;

    // Constructors.
    constructor(private readonly _session: QbsSession) {
        this._projectFileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._projectFileButton.tooltip = localize('qbs.active.project.select.tooltip', 'Click to select the active project');
        this._projectFileButton.command = 'qbs.selectProject';
        this._projectFileButton.show();

        // Subscribe on the session events.
        _session.onProjectUriChanged(uri => {
            this.updateProjectName(uri);
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

    // Private methods.
    private async initialize() {
        await this.updateProjectName();
    }

    private async updateProjectName(uri?: vscode.Uri) {
        const projectName = uri ? basename(uri.fsPath) : localize('qbs.active.project.empty', 'empty');
        this._projectFileButton.text = localize('qbs.active.project.select', '$(project) Project (' + projectName + ')');
    }
}
