import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from './qbssession';
import * as QbsUtils from './qbsutils';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class QbsStatusBar implements vscode.Disposable {
    private _sessionStatusButton: vscode.StatusBarItem;
    private _selectProjectButton: vscode.StatusBarItem;
    private _selectBuildProfileButton: vscode.StatusBarItem;
    private _selectBuildConfigurationButton: vscode.StatusBarItem;
    private _startBuildProductButton: vscode.StatusBarItem;
    private _selectBuildProductButton: vscode.StatusBarItem;
    private _selectRunProductButton: vscode.StatusBarItem;

    constructor(private readonly _session: QbsSession) {
        const alignment = vscode.StatusBarAlignment.Left;

        this._sessionStatusButton = vscode.window.createStatusBarItem(alignment, -1);
        this._sessionStatusButton.tooltip = localize('qbs.session.status.tooltip', 
                                                     'QBS session status');
        this._sessionStatusButton.show();

        this._selectProjectButton = vscode.window.createStatusBarItem(alignment, -2);
        this._selectProjectButton.tooltip = localize('qbs.select.active.project.file.tooltip',
                                                     'Click to select the active project');
        this._selectProjectButton.command = 'qbs.selectProject';
        this._selectProjectButton.show();

        this._selectBuildProfileButton = vscode.window.createStatusBarItem(alignment, -3);
        this._selectBuildProfileButton.tooltip = localize('qbs.select.build.profile.tooltip',
                                                          'Click to select the build profile');
        this._selectBuildProfileButton.command = 'qbs.selectProfile';
        this._selectBuildProfileButton.show();

        this._selectBuildConfigurationButton = vscode.window.createStatusBarItem(alignment, -4);
        this._selectBuildConfigurationButton.tooltip = localize('qbs.select.build.configuration.tooltip',
                                                                'Click to select the build configuration');
        this._selectBuildConfigurationButton.command = 'qbs.selectConfiguration';
        this._selectBuildConfigurationButton.show();

        this._startBuildProductButton = vscode.window.createStatusBarItem(alignment, -5);
        this._startBuildProductButton.text = localize('qbs.start.build.product', `$(gear) Build`);
        this._startBuildProductButton.tooltip = localize('qbs.start.build.product.tooltip',
                                                         'Click to build the selected product');
        this._startBuildProductButton.command = 'qbs.build';
        this._startBuildProductButton.show();

        this._selectBuildProductButton = vscode.window.createStatusBarItem(alignment, -6);
        this._selectBuildProductButton.text = '[none]';
        this._selectBuildProductButton.tooltip = localize('qbs.select.build.product.tooltip',
                                                          'Click to select the product to build');
        this._selectBuildProductButton.command = 'qbs.selectBuild';
        this._selectBuildProductButton.show();

        this._selectRunProductButton = vscode.window.createStatusBarItem(alignment, -100);
        this._selectRunProductButton.text = '[]';
        this._selectRunProductButton.tooltip = localize('qbs.select.run.product,tooltip',
                                                        'Click to select the product to run');
        this._selectRunProductButton.command = 'qbs.selectRun';
        this._selectRunProductButton.show();

        _session.onStatusChanged(status => this.updateSessionStatus(
            QbsUtils.sessionStatusName(this._session.status)));
        _session.onProjectUriChanged(uri => this.updateProjectFileName(uri));
        _session.onProfileNameChanged(name => this.updateProfileName(name));
        _session.onConfigurationNameChanged(name => this.updateConfigurationName(name));
        _session.onBuildProductChanged(product => this.updateBuildProductName(product.fullDisplayName));
        _session.onRunProductChanged(product => this.updateRunProductName(product.fullDisplayName));

        this.initialize();
    }

    dispose() {
        this._selectRunProductButton.dispose();
        this._selectBuildProductButton.dispose();
        this._startBuildProductButton.dispose();
        this._selectBuildConfigurationButton.dispose();
        this._selectBuildProfileButton.dispose();
        this._selectProjectButton.dispose();
        this._sessionStatusButton.dispose();
    }

    private async initialize() {
        await this.updateSessionStatus(
            QbsUtils.sessionStatusName(this._session.status));
        await this.updateProjectFileName();
        await this.updateProfileName();
        await this.updateConfigurationName();
        await this.updateBuildProductName();
        await this.updateRunProductName();
    }

    private async updateSessionStatus(status: string) {
        this._sessionStatusButton.text = localize('qbs.session.status', 
                                                  `$(info) QBS: ${status}`);
    }

    private async updateProjectFileName(uri?: vscode.Uri) {
        const text = uri ? QbsUtils.fileBaseName(uri)
                         : localize('qbs.active.project.empty', 'empty');
        this._selectProjectButton.text = localize('qbs.select.active.project',
                                                  `$(project) [${text}]`);
    }

    private async updateProfileName(profile?: string) {
        const text = profile ? profile : localize('qbs.active.profile.empty', 'none');
        this._selectBuildProfileButton.text = localize('qbs.select.build.profile',
                                                       `$(tools) [${text}]`);
    }

    private async updateConfigurationName(configuration?: string) {
        const text = configuration ? configuration : 'default';
        this._selectBuildConfigurationButton.text = localize('qbs.select.build.configuration',
                                                             `$(settings) [${text}]`);
    }

    private async updateBuildProductName(name?: string) {
        const text = name ? name : 'all';
        this._selectBuildProductButton.text = `[${text}]`;
    }

    private async updateRunProductName(name?: string) {
        const text = name ? name : '';
        this._selectRunProductButton.text = `[${text}]`;
    }
}
