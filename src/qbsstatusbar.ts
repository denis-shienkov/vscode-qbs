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
    private _buildProductButton: vscode.StatusBarItem;
    private _selectBuildProductButton: vscode.StatusBarItem;
    private _runProductButton: vscode.StatusBarItem;
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

        this._buildProductButton = vscode.window.createStatusBarItem(alignment, -5);
        this._buildProductButton.text = localize('qbs.build.product', `$(gear) Build`);
        this._buildProductButton.tooltip = localize('qbs.build.product.tooltip',
                                                    'Click to build the selected product');
        this._buildProductButton.command = 'qbs.build';
        this._buildProductButton.show();

        this._selectBuildProductButton = vscode.window.createStatusBarItem(alignment, -6);
        this._selectBuildProductButton.text = '[none]';
        this._selectBuildProductButton.tooltip = localize('qbs.select.build.product.tooltip',
                                                          'Click to select the product to build');
        this._selectBuildProductButton.command = 'qbs.selectBuild';
        this._selectBuildProductButton.show();

        this._runProductButton = vscode.window.createStatusBarItem(alignment, -7);
        this._runProductButton.text = localize('qbs.run.product', `$(play)`);
        this._runProductButton.tooltip = localize('qbs.run.product.tooltip',
                                                  'Click to run the selected product');
        this._runProductButton.command = 'qbs.run';
        this._runProductButton.show();

        this._selectRunProductButton = vscode.window.createStatusBarItem(alignment, -100);
        this._selectRunProductButton.text = '[]';
        this._selectRunProductButton.tooltip = localize('qbs.select.run.product,tooltip',
                                                        'Click to select the product to run');
        this._selectRunProductButton.command = 'qbs.selectRun';
        this._selectRunProductButton.show();

        _session.onStatusChanged(x => this.updateControls());
        _session.onProjectActivated(project => {
            this.updateControls();
            project.buildStep().onChanged(x => this.updateControls());
            project.runStep().onChanged(x => this.updateControls());
        });

        this.updateControls();
    }

    dispose() {
        this._selectRunProductButton.dispose();
        this._selectBuildProductButton.dispose();
        this._buildProductButton.dispose();
        this._selectBuildConfigurationButton.dispose();
        this._selectBuildProfileButton.dispose();
        this._selectProjectButton.dispose();
        this._sessionStatusButton.dispose();
    }

    private async updateControls() {
        // Update the session status.
        const statusName = QbsSession.statusName(this._session.status());
        this._sessionStatusButton.text = localize('qbs.session.status',
                                                  `$(info) QBS: ${statusName}`);
        // Update the active project name.
        const project = this._session.project();
        const projectName = project?.name()
            || localize('qbs.active.project.empty', 'empty');
        this._selectProjectButton.text = localize('qbs.select.active.project',
                                                  `$(project) [${projectName}]`);
        const buildStep = project?.buildStep();
        const runStep = project?.runStep();

        // Update the current build profile name.
        const profileName = buildStep?.profileName()
            || localize('qbs.active.profile.empty', 'none');
        this._selectBuildProfileButton.text = localize('qbs.select.build.profile',
                                                       `$(tools) [${profileName}]`);
        // Update the current build configuration name.
        const configName = buildStep?.configurationName() || 'debug';
        this._selectBuildConfigurationButton.text = localize('qbs.select.build.configuration',
                                                             `$(settings) [${configName}]`);
        // Update the current build product name.
        const buildProductName = buildStep?.productName() || 'empty';
        this._selectBuildProductButton.text = `[${buildProductName}]`;
        // Update the current run product name.
        const runProductName = runStep?.productName() || '---';
        this._selectRunProductButton.text = `[${runProductName}]`;
    }
}
