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
import * as jsonc from 'jsonc-parser';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';

import {QbsConfigData} from './datatypes/qbsconfigdata';
import {QbsDebuggerData} from './datatypes/qbsdebuggerdata';
import {QbsDebuggerKey} from './datatypes/qbskeys';
import {QbsDataKey} from './datatypes/qbskeys';
import {QbsErrorHandlingMode} from './datatypes/qbserrorhandlingmode';
import {QbsCommandEchoMode} from './datatypes/qbscommandechomode';
import {QbsLogLevel} from './datatypes/qbsloglevel';
import {QbsProfileData} from './datatypes/qbsprofiledata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

const QBS_SETTINGS_SECTION = 'qbs';

// Path patterns.
const CONFIGURATION_NAME_PATTERN = '${configurationName}';
const PROFILE_NAME_PATTERN = '${profileName}';
const SOURCE_DIR_PATTERN = '${sourceDirectory}';

// Default settings.
const DEFAULT_BUILD_DIR_PATH = `${SOURCE_DIR_PATTERN}/build/${PROFILE_NAME_PATTERN}_${CONFIGURATION_NAME_PATTERN}`;
const DEFAULT_CLEAN_INSTALL_ROOT = false;
const DEFAULT_ERROR_HANDLING_MODE = QbsErrorHandlingMode.Relaxed;
const DEFAULT_FORCE_PROBES = false;
const DEFAULT_KEEP_GOING = false;
const DEFAULT_LAUNCH_FILE_PATH = `${SOURCE_DIR_PATTERN}/.vscode/launch.json`;
const DEFAULT_LOG_LEVEL = QbsLogLevel.Info;
const DEFAULT_MAX_BUILD_JOBS = 0;
const DEFAULT_QBS_EXE_PATH = 'qbs';
const DEFAULT_SETTINGS_DIR_PATH = '';
const DEFAULT_COMMAND_ECHO_MODE = QbsCommandEchoMode.Summary;
const DEFAULT_SHOW_DISABLED_PROJECT_ITEMS = true;
const DEFAULT_CLEAR_OUTPUT_BEFORE_OPERATION = false;
const DEFAULT_CONFIGURATIONS_FILE_PATH = `${SOURCE_DIR_PATTERN}/.vscode/qbs-configurations.json`;

export enum QbsSettingsEvent {
    NothingRequired,
    SessionRestartRequired,
    ProjectResolveRequired,
    DebuggerUpdateRequired,
    ProjectTreeUpdateRequired,
    ConfigurationUpdateRequired
}

export class QbsSettings implements vscode.Disposable {
    private _settings: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(QBS_SETTINGS_SECTION);
    private _debuggerSettingsWatcher?: chokidar.FSWatcher
    private _configurationsWatcher?: chokidar.FSWatcher
    private _onChanged: vscode.EventEmitter<QbsSettingsEvent> = new vscode.EventEmitter<QbsSettingsEvent>();
    readonly onChanged: vscode.Event<QbsSettingsEvent> = this._onChanged.event;

    constructor(private readonly _session: QbsSession) {
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            this._settings = vscode.workspace.getConfiguration(QBS_SETTINGS_SECTION);

            if (e.affectsConfiguration('qbs.qbsPath')) {
                this._onChanged.fire(QbsSettingsEvent.SessionRestartRequired);
            }
            let signal = QbsSettingsEvent.NothingRequired;
            if (e.affectsConfiguration('qbs.showDisabledProjectItems')) {
                signal = QbsSettingsEvent.ProjectTreeUpdateRequired;
            } else if (e.affectsConfiguration('qbs.forceProbes')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.errorHandlingMode')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.logLevel')) {
                signal = QbsSettingsEvent.ProjectResolveRequired;
            } else if (e.affectsConfiguration('qbs.launchFilePath')) {
                signal = QbsSettingsEvent.DebuggerUpdateRequired;
                this.subscribeDebuggerSettingsChanged();
            } else if (e.affectsConfiguration('qbs.configurationsFilePath')) {
                signal = QbsSettingsEvent.ConfigurationUpdateRequired;
                this.subscribeConfigurationsChanged();
            }
            if (signal !== QbsSettingsEvent.NothingRequired) {
                this._onChanged.fire(signal);
            }
        });

        this.subscribeDebuggerSettingsChanged();
        this.subscribeConfigurationsChanged();
    }

    dispose() { this._debuggerSettingsWatcher?.close(); }

    /**
     * Returns the path to the QBS executable obtained
     * from the plugin configuration.
     */
    executablePath(): string {
        const v = this._settings.get<string>('qbsPath', DEFAULT_QBS_EXE_PATH);
        return this.completePath(v);
    }

    /**
     * Returns the full path to the 'launch.json' file
     * obtained from the plugin configuration.
     */
    debuggerSettingsPath(): string {
        const v = this._settings.get<string>('launchFilePath', DEFAULT_LAUNCH_FILE_PATH);
        return this.completePath(v);
    }

    /**
     * Returns the path to the custom QBS settings directory
     * obtained from the plugin configuration.
     */
    settingsDirectory(): string {
        const v = this._settings.get<string>('settingsDirectory', DEFAULT_SETTINGS_DIR_PATH);
        return this.completePath(v);
    }

    /**
     * Returns the path to the QBS build directory
     * obtained from the plugin configuration.
     */
    buildDirectory(): string {
        const v = this._settings.get<string>('buildDirectory', DEFAULT_BUILD_DIR_PATH);
        return this.completePath(v);
    }

    /**
     * Returns the value of the QBS 'keep-going' property
     * obtained from the plugin configuration.
     */
    keepGoing(): boolean {
        return this._settings.get<boolean>('keepGoing', DEFAULT_KEEP_GOING);
    }

    /**
     * Returns the value of the QBS 'max-build-jobs' property
     * obtained from the plugin configuration.
     */
    maxJobs(): number {
        return this._settings.get<number>('maxBuildJobs', DEFAULT_MAX_BUILD_JOBS);
    }

    /**
     * Returns the value of the QBS 'command-echo-mode' property
     * obtained from the plugin configuration.
     */
    commandEchoMode(): QbsCommandEchoMode {
        return this._settings.get<QbsCommandEchoMode>('commandEchoMode', DEFAULT_COMMAND_ECHO_MODE);
    }

    /**
     * Returns the value of the QBS 'force-probes' property
     * obtained from the plugin configuration.
     */
    forceProbes(): boolean {
        return this._settings.get<boolean>('forceProbes', DEFAULT_FORCE_PROBES);
    }

    /**
     * Returns the value of the QBS 'clean-install-root' property
     * obtained from the plugin configuration.
     */
    cleanInstallRoot(): boolean {
        return this._settings.get<boolean>('cleanInstallRoot', DEFAULT_CLEAN_INSTALL_ROOT);
    }

    /**
     * Returns the value of the QBS 'error-handling-mode' property
     * obtained from the plugin configuration.
     */
    errorHandlingMode(): QbsErrorHandlingMode {
        return this._settings.get<QbsErrorHandlingMode>('errorHandlingMode', DEFAULT_ERROR_HANDLING_MODE);
    }

    /**
     * Returns the value of the QBS 'log-level' property
     * obtained from the plugin configuration.
     */
    logLevel(): QbsLogLevel {
        return this._settings.get<QbsLogLevel>('logLevel', DEFAULT_LOG_LEVEL);
    }

    showDisabledProjectItems(): boolean {
        return this._settings.get<boolean>('showDisabledProjectItems', DEFAULT_SHOW_DISABLED_PROJECT_ITEMS);
    }

    configurationsFilePath(): string {
        const v = this._settings.get<string>('configurationsFilePath', DEFAULT_CONFIGURATIONS_FILE_PATH);
        return this.completePath(v);
    }

    clearOutputBeforeOperation(): boolean {
        return this._settings.get<boolean>('clearOutputBeforeOperation', DEFAULT_CLEAR_OUTPUT_BEFORE_OPERATION);
    }

    /**
     * Requests the path to the QBS executable file from the plugin
     * configuration and checks for its presence in the file system.
     * Depending on the result, displays the appropriate message box
     * and then returns the ensuring result.
     */
    async ensureQbsExecutableConfigured(): Promise<boolean> {
        let qbsPath = this.executablePath();
        if (qbsPath === DEFAULT_QBS_EXE_PATH) {
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
                        const profiles: QbsProfileData[] = [new QbsProfileData({"none": {}})];
                        stdout.split('\n').map(function(line) {
                            line = QbsUtils.trimLine(line);
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
        return new Promise<QbsConfigData[]>((resolve, reject) => {
            const configsPath = this.configurationsFilePath();
            if (!fs.existsSync(configsPath)) {
                resolve(QbsUtils.getDefaultConfigurations());
                return;
            }
            fs.readFile(configsPath, (error, data) => {
                const configurations: QbsConfigData[] = [];
                try {
                    const text = data.toString();
                    const items: any[] = jsonc.parse(text) || [];
                    items.forEach(item => {
                        const name = item[QbsDataKey.Name];
                        if (name) {
                            const display = item[QbsDataKey.DisplayName]
                                || item[QbsDataKey.DisplayNameOld];
                            const descr = item[QbsDataKey.Description];
                            const props = item[QbsDataKey.Properties]
                                || item[QbsDataKey.OverriddenProperties];
                            configurations.push(new QbsConfigData(name, display, descr, props)) ;
                        }
                    });
                } catch (e) {
                    console.warn(e);
                }
                resolve(configurations);
            });
        });
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
                    const json = jsonc.parse(text);
                    const configurations: any[] = json[QbsDebuggerKey.Configutations] || [];
                    configurations.forEach(configuration => debuggers.push(new QbsDebuggerData(configuration)));
                } catch (e) {
                    console.warn(e);
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
        configPath = configPath.replace(PROFILE_NAME_PATTERN, buildStep?.profileName() || 'none');
        configPath = configPath.replace(CONFIGURATION_NAME_PATTERN, buildStep?.configurationName() || 'none');
        const sourceDirectory = (vscode.workspace.workspaceFolders
            && vscode.workspace.workspaceFolders.length > 0)
                ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
        configPath = configPath.replace(SOURCE_DIR_PATTERN, sourceDirectory);
        return QbsUtils.fixPathSeparators(configPath);
    }

    private async subscribeDebuggerSettingsChanged() {
        this._debuggerSettingsWatcher?.close();
        const settingsPath = this.debuggerSettingsPath();
        this._debuggerSettingsWatcher = chokidar.watch(settingsPath, {ignoreInitial: true});
        this._debuggerSettingsWatcher.on('change', () => { this._onChanged.fire(QbsSettingsEvent.DebuggerUpdateRequired); });
    }

    private async subscribeConfigurationsChanged() {
        this._configurationsWatcher?.close();
        const configurationsPath = this.configurationsFilePath();
        this._configurationsWatcher = chokidar.watch(configurationsPath, {ignoreInitial: true});
        this._configurationsWatcher.on('change', () => { this._onChanged.fire(QbsSettingsEvent.ConfigurationUpdateRequired); });
    }
}
