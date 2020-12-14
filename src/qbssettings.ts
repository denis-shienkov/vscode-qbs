/**
 * @file This file contains a set of useful helper functions
 * to access to the QBS plugin's configuration settings.
 */

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as fs from 'fs';
import * as which from 'which';
import * as cp from 'child_process';
import * as chokidar from 'chokidar';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';

import {QbsConfigData} from './datatypes/qbsconfigdata';
import {QbsDebuggerData} from './datatypes/qbsdebuggerdata';
import {QbsErrorHandlingMode} from './datatypes/qbserrorhandlingmode';
import {QbsLogLevel} from './datatypes/qbsloglevel';
import {QbsProfileData} from './datatypes/qbsprofiledata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export enum QbsSettingsEvent {
    NothingRequired,
    SessionRestartRequired,
    ProjectResolveRequired,
    DebuggerUpdateRequired
}

export class QbsSettings implements vscode.Disposable {
    private _debuggerSettingsWatcher?: chokidar.FSWatcher
    private _onChanged: vscode.EventEmitter<QbsSettingsEvent> = new vscode.EventEmitter<QbsSettingsEvent>();
    readonly onChanged: vscode.Event<QbsSettingsEvent> = this._onChanged.event;

    constructor(private readonly _session: QbsSession) {
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('qbs.qbsPath')) {
                this._onChanged.fire(QbsSettingsEvent.SessionRestartRequired);
            }
            let signal = QbsSettingsEvent.NothingRequired;
            if (e.affectsConfiguration('qbs.forceProbes')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.errorHandlingMode')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.logLevel')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.launchFilePath')) {
                signal = QbsSettingsEvent.DebuggerUpdateRequired;
                this.subscribeDebuggerSettingsChanged();
            }
            if (signal !== QbsSettingsEvent.NothingRequired) {
                this._onChanged.fire(signal);
            }
        });

        this.subscribeDebuggerSettingsChanged();
    }

    dispose() { this._debuggerSettingsWatcher?.close(); }

    /**
     * Returns the path to the QBS executable obtained
     * from the plugin configuration.
     */
    executablePath(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('qbsPath') as string;
        return this.completePath(v);
    }

    /**
     * Returns the full path to the 'launch.json' file
     * obtained from the plugin configuration.
     */
    debuggerSettingsPath(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('launchFilePath') as string;
        return this.completePath(v);
    }

    /**
     * Returns the path to the custom QBS settings directory
     * obtained from the plugin configuration.
     */
    settingsDirectory(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('settingsDirectory') as string;
        return this.completePath(v);
    }

    /**
     * Returns the path to the QBS build directory
     * obtained from the plugin configuration.
     */
    buildDirectory(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('buildDirectory') as string;
        return this.completePath(v);
    }

    /**
     * Returns the value of the QBS 'keep-going' property
     * obtained from the plugin configuration.
     */
    keepGoing(): boolean {
        const v = vscode.workspace.getConfiguration('qbs').get('keepGoing') as boolean;
        return v || false;
    }

    /**
     * Returns the value of the QBS 'max-build-jobs' property
     * obtained from the plugin configuration.
     */
    maxJobs(): number {
        const v = vscode.workspace.getConfiguration('qbs').get('maxBuildJobs') as number;
        return v || 0;
    }

    /**
     * Returns the value of the QBS 'show-command-line' property
     * obtained from the plugin configuration.
     */
    showCommandLines(): boolean {
        const v = vscode.workspace.getConfiguration('qbs').get('showCommandLines') as boolean;
        return v || false;
    }

    /**
     * Returns the value of the QBS 'force-probes' property
     * obtained from the plugin configuration.
     */
    forceProbes(): boolean {
        const v = vscode.workspace.getConfiguration('qbs').get('forceProbes') as boolean;
        return v || false;
    }

    /**
     * Returns the value of the QBS 'clean-install-root' property
     * obtained from the plugin configuration.
     */
    cleanInstallRoot(): boolean {
        const v = vscode.workspace.getConfiguration('qbs').get('cleanInstallRoot') as boolean;
        return v || false;
    }

    /**
     * Returns the value of the QBS 'error-handling-mode' property
     * obtained from the plugin configuration.
     */
    errorHandlingMode(): QbsErrorHandlingMode {
        const v = vscode.workspace.getConfiguration('qbs').get('errorHandlingMode') as QbsErrorHandlingMode;
        return v || QbsErrorHandlingMode.Relaxed;
    }

    /**
     * Returns the value of the QBS 'log-level' property
     * obtained from the plugin configuration.
     */
    logLevel(): QbsLogLevel {
        const v = vscode.workspace.getConfiguration('qbs').get('logLevel') as QbsLogLevel;
        return v || QbsLogLevel.Info;
    }

    /**
     * Requests the path to the QBS executable file from the plugin
     * configuration and checks for its presence in the file system.
     * Depending on the result, displays the appropriate message box
     * and then returns the ensuring result.
     */
    async ensureQbsExecutableConfigured(): Promise<boolean> {
        let qbsPath = this.executablePath();
        if (qbsPath === 'qbs') {
            try {
                qbsPath = which.sync(qbsPath);
            } catch (e) {}
        }

        if (!qbsPath) {
            await vscode.window.showErrorMessage(localize('qbs.executable.missed.error.message',
                                                          'QBS executable not set in configuration.'));
            return false;
        } else if (!fs.existsSync(qbsPath)) {
            await vscode.window.showErrorMessage(localize('qbs.executable.not-found.error.message',
                                                          `QBS executable not found.`));
            return false;
        }
        return true;
    }

    async detectProfiles(): Promise<boolean> {
        return new Promise<boolean> ((resolve, reject) => {
            const qbsPath = this.executablePath();
            if (!qbsPath) {
                reject(undefined);
            } else {
                let qbsShell = `"${qbsPath}" setup-toolchains --detect`;
                const qbsSettingsDirectory = this.settingsDirectory();
                if (qbsSettingsDirectory) {
                    qbsShell += ' --settings-dir ' + qbsSettingsDirectory;
                }
                cp.exec(qbsShell, (error, stdout, stderr) => {
                    if (error) {
                        reject(undefined);
                    } else {
                        resolve(true);
                    }
                });
            }
        });
    }

    /**
     * Returns the list of all available QBS build profile names.
     *
     * @note This function calls the Qbs executable and parses the output.
     */
    async enumerateProfiles(): Promise<QbsProfileData[]> {
        return new Promise<QbsProfileData[]>((resolve, reject) => {
            const qbsPath = this.executablePath();
            if (!qbsPath) {
                reject(undefined);
            } else {
                let qbsShell = `"${qbsPath}" config --list`;
                const qbsSettingsDirectory = this.settingsDirectory();
                if (qbsSettingsDirectory) {
                    qbsShell += ' --settings-dir ' + qbsSettingsDirectory;
                }
                cp.exec(qbsShell, (error, stdout, stderr) => {
                    if (error) {
                        reject(undefined);
                    } else {
                        const profiles: QbsProfileData[] = [];
                        stdout.split('\n').map(function (line) {
                            line = line.replace(/[\n\r]/g, '');
                            const matches = /^profiles.([\w|-]+)./.exec(line);
                            if (matches) {
                                const name = matches[1];
                                const index = profiles.map(profile => profile.name()).indexOf(name);
                                if (index === -1) {
                                    // Create data object in a form of: { 'name': {} }.
                                    let data: any = {};
                                    data[name] = { qbs: {} };
                                    profiles.push(new QbsProfileData(data));
                                } else {
                                    const qbs = profiles[index].qbs();
                                    const re = new RegExp(`^profiles.${name}.qbs.architecture:\\s\"(.+)\"$`, 'g');
                                    const matches = re.exec(line);
                                    if (matches) {
                                        qbs.setArchitecture(matches[1]);
                                    } else {
                                        const re = new RegExp(`^profiles.${name}.qbs.targetPlatform:\\s\"(.+)\"$`, 'g');
                                        const matches = re.exec(line);
                                        if (matches) {
                                            qbs.setTargetPlatform(matches[1]);
                                        } else {
                                            const re = new RegExp(`^profiles.${name}.qbs.toolchainType:\\s\"(.+)\"$`, 'g');
                                            const matches = re.exec(line);
                                            if (matches) {
                                                qbs.setToolchainType(matches[1]);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                        resolve(profiles);
                    }
                });
            }
        });
    }

    /**
     * Returns the list of all available QBS build configuration names.
     *
     * @note Right now these are just two hardcoded configurations
     * @c debug and @c release.
     */
    async enumerateConfigurations(): Promise<QbsConfigData[]> {
        const configurations = [];
        configurations.push(new QbsConfigData(
            'debug',
            localize('qbs.configuration.debug.label', 'Debug'),
            localize('qbs.configuration.debug.description', 'Disable optimizations.'))
        );
        configurations.push(new QbsConfigData(
            'release',
            localize('qbs.configuration.release.label', 'Release'),
            localize('qbs.configuration.release.description', 'Enable optimizations.'))
        );
        configurations.push(new QbsConfigData(
            'custom',
            localize('qbs.configuration.custom.label', '[Custom]'),
            localize('qbs.configuration.custom.description', 'Custom configuration.'))
        );
        return configurations;
    }

    /**
     * Returns the list of all available debug configurations
     * stored in the 'launch.json' files.
     */
    async enumerateDebuggers(): Promise<QbsDebuggerData[]> {
        return new Promise<QbsDebuggerData[]>((resolve, reject) => {
            const settingsPath = this.debuggerSettingsPath();
            fs.readFile(settingsPath, (error, data) => {
                const debuggers: QbsDebuggerData[] = [ QbsDebuggerData.createAutomatic() ];
                try {
                    const text = data.toString();
                    const json = JSON.parse(text);
                    const configurations: any[] = json['configurations'] || [];
                    configurations.forEach(configuration => debuggers.push(new QbsDebuggerData(configuration)));
                } catch (e) {
                }
                resolve(debuggers);
            });
        });
    }

    /**
     * Fixes and fills the @c path that contains the pre-defined templates
     * like '$ {sourceDirectory|profileName|configurationName}' and
     * returns the resulting full path.
     *
     * @note Can be used to fix paths obtained from the plugin configurations.
     */
    private completePath(configPath: string): string {
        const buildStep = this._session.project()?.buildStep();
        configPath = configPath.replace('${profileName}', buildStep?.profileName() || 'none');
        configPath = configPath.replace('${configurationName}', buildStep?.configurationName() || 'none');
        const sourceDirectory = (vscode.workspace.workspaceFolders
            && vscode.workspace.workspaceFolders.length > 0)
                ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
        configPath = configPath.replace('${sourceDirectory}', sourceDirectory);
        return QbsUtils.fixPathSeparators(configPath);
    }

    private async subscribeDebuggerSettingsChanged() {
        this._debuggerSettingsWatcher?.close();
        const settingsPath = this.debuggerSettingsPath();
        this._debuggerSettingsWatcher = chokidar.watch(settingsPath, {ignoreInitial: true});
        this._debuggerSettingsWatcher.on('change', () => { this._onChanged.fire(QbsSettingsEvent.DebuggerUpdateRequired); });
    }
}
