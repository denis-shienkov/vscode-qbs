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
        this._projectFileButton.tooltip = localize('qbs.active.project.select.tooltip', 'Active QBS Project File');
        this._projectFileButton.show();

        // Subscribe on session events.
        _session.onProjectUriChanged((uri) => this.updateProjectName);

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
        const projectName = ((uri) ? basename(uri.fsPath) : '(empty)');
        this._projectFileButton.text = localize('qbs.active.project.select', '$(project) Active project: ' + projectName);
    }
}