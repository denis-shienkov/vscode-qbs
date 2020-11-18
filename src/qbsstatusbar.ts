import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as fs from 'fs';

import {QbsSession} from './qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsStatusBar implements vscode.Disposable {
    private _sessionStatusButton: vscode.StatusBarItem;
    private _selectProjectButton: vscode.StatusBarItem;
    private _selectBuildProfileButton: vscode.StatusBarItem;
    private _selectBuildConfigurationButton: vscode.StatusBarItem;
    private _buildProductButton: vscode.StatusBarItem;
    private _selectBuildProductButton: vscode.StatusBarItem;
    private _runProductButton: vscode.StatusBarItem;
    private _debugProductButton: vscode.StatusBarItem;
    private _selectRunProductButton: vscode.StatusBarItem;
    private _selectDebuggerButton: vscode.StatusBarItem;

    constructor(private readonly _session: QbsSession) {
        this._sessionStatusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
        this._sessionStatusButton.tooltip = localize('qbs.session.status.tooltip',
                                                     'QBS Session Status');
        this._sessionStatusButton.show();

        this._selectProjectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -2);
        this._selectProjectButton.tooltip = localize('qbs.select.active.project.file.tooltip',
                                                     'Click to Select the Active Project');
        this._selectProjectButton.command = 'qbs.selectProject';
        this._selectProjectButton.show();

        this._selectBuildProfileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -3);
        this._selectBuildProfileButton.tooltip = localize('qbs.select.build.profile.tooltip',
                                                          'Click to Select the Build Profile');
        this._selectBuildProfileButton.command = 'qbs.selectProfile';
        this._selectBuildProfileButton.show();

        this._selectBuildConfigurationButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -4);
        this._selectBuildConfigurationButton.tooltip = localize('qbs.select.build.configuration.tooltip',
                                                                'Click to Select the Build Configuration');
        this._selectBuildConfigurationButton.command = 'qbs.selectConfiguration';
        this._selectBuildConfigurationButton.show();

        this._buildProductButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -5);
        this._buildProductButton.text = localize('qbs.build.product', `$(gear) Build`);
        this._buildProductButton.tooltip = localize('qbs.build.product.tooltip',
                                                    'Click to Build the Selected Product');
        this._buildProductButton.command = 'qbs.build';
        this._buildProductButton.show();

        this._selectBuildProductButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -6);
        this._selectBuildProductButton.text = '[none]';
        this._selectBuildProductButton.tooltip = localize('qbs.select.build.product.tooltip',
                                                          'Click to Select the Product to Build');
        this._selectBuildProductButton.command = 'qbs.selectBuild';
        this._selectBuildProductButton.show();

        this._runProductButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -7);
        this._runProductButton.text = localize('qbs.run.product', `$(play)`);
        this._runProductButton.tooltip = localize('qbs.run.product.tooltip',
                                                  'Click to Run the Selected Product');
        this._runProductButton.command = 'qbs.run';
        this._runProductButton.show();

        this._debugProductButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -8);
        this._debugProductButton.text = localize('qbs.debug.product', `$(bug)`);
        this._debugProductButton.tooltip = localize('qbs.debug.product.tooltip',
                                                    'Click to Debug the Selected Product');
        this._debugProductButton.command = 'qbs.debug';
        this._debugProductButton.show();

        this._selectRunProductButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -100);
        this._selectRunProductButton.text = '[]';
        this._selectRunProductButton.tooltip = localize('qbs.select.run.product.tooltip',
                                                        'Click to Select the Product to Debug or Run');
        this._selectRunProductButton.command = 'qbs.selectRun';
        this._selectRunProductButton.show();

        this._selectDebuggerButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this._selectDebuggerButton.text = '[No debugger]';
        this._selectDebuggerButton.tooltip = localize('qbs.select.debugger.tooltip',
                                                      'Click to Select the Launch Configuration');
        this._selectDebuggerButton.command = 'qbs.selectDebugger';
        this._selectDebuggerButton.show();

        _session.onStatusChanged(async () => await this.updateControls());
        _session.onProjectActivated(async (project) => {
            await this.updateControls();
            project.buildStep().onChanged(async () => await this.updateControls());
            project.runStep().onChanged(async () => await this.updateControls());
        });

        this.updateControls();
    }

    dispose() {
        this._selectRunProductButton.dispose();
        this._selectBuildProductButton.dispose();
        this._buildProductButton.dispose();
        this._runProductButton.dispose();
        this._selectBuildConfigurationButton.dispose();
        this._selectBuildProfileButton.dispose();
        this._selectProjectButton.dispose();
        this._sessionStatusButton.dispose();
    }

    private async updateControls() {
        // Update the session status.
        const statusName = QbsSession.statusName(this._session.status());
        this._sessionStatusButton.text = `$(info) QBS: ${statusName}`;
        // Update the active project name.
        const project = this._session.project();
        const projectName = project?.name() || localize('qbs.active.project.empty', 'empty');
        this._selectProjectButton.text = `$(project) [${projectName}]`;
        const buildStep = project?.buildStep();
        const runStep = project?.runStep();

        // Update the current build profile name.
        const profileName = buildStep?.profileName() || localize('qbs.active.profile.empty', 'none');
        this._selectBuildProfileButton.text = `$(tools) [${profileName}]`;
        // Update the current build configuration name.
        const configName = buildStep?.configurationName() || 'debug';
        this._selectBuildConfigurationButton.text = `$(settings) [${configName}]`;
        // Update the current build product name.
        const buildProductName = buildStep?.productName() || 'empty';
        this._selectBuildProductButton.text = `[${buildProductName}]`;
        // Update the current run product name.
        const runProductName = runStep?.productName() || '---';
        const runProductExe = runStep?.targetExecutable() || '';
        this._selectRunProductButton.text = `[${runProductName}]`;
        if (fs.existsSync(runProductExe)) {
            this._runProductButton.color = 'lightgreen';
            this._debugProductButton.color = 'lightgreen';
            this._selectRunProductButton.tooltip = localize('qbs.select.run.product.tooltip',
                                                            'Click to Select the Product to Debug or Run') + `\n\n${runProductExe}`;
        } else {
            this._runProductButton.color = 'orange';
            this._debugProductButton.color = 'orange';
            this._selectRunProductButton.tooltip = localize('qbs.select.run.product.tooltip',
                                                            `Click to Select the Product to Debug or Run`);
        }
        // Update the current debugger name.
        const debuggerName = runStep?.debuggerName()
            || localize('qbs.select.debugger.empty', 'No debugger');
        this._selectDebuggerButton.text = `[${debuggerName}]`;
    }
}
