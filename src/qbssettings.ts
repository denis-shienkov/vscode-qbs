/**
 * @file This file contains a set of useful helper functions
 * to access to the QBS plugin's configuration settings.
 */

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as fs from 'fs';
import * as which from 'which';
import * as cp from 'child_process';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';
import {QbsProfileData, QbsConfigData, QbsDebuggerData} from './qbstypes';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export enum QbsSettingsEvent {
    NothingRequired,
    SessionRestartRequired,
    ProjectResolveRequired
}

export class QbsSettings implements vscode.Disposable {
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
            }
            if (signal !== QbsSettingsEvent.NothingRequired) {
                this._onChanged.fire(signal);
            }
        });
    }

    dispose() {}

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
    errorHandlingMode(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('errorHandlingMode') as string;
        return v || 'relaxed';
    }

    /**
     * Returns the value of the QBS 'log-level' property
     * obtained from the plugin configuration.
     */
    logLevel(): string {
        const v = vscode.workspace.getConfiguration('qbs').get('logLevel') as string;
        return v || 'info';
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
            qbsPath = which.sync(qbsPath);
        }

        if (!qbsPath) {
            await vscode.window.showErrorMessage(localize('qbs.executable.missed.error.message',
                                                          'QBS executable not set in configuration.'));
            return false;
        } else if (!fs.existsSync(qbsPath)) {
            await vscode.window.showErrorMessage(localize('qbs.executable.not-found.error.message',
                                                          `QBS executable ${qbsPath} not found.`));
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
                            if (!line.startsWith('profiles'))
                                return;
                            const startIndex = line.indexOf('.');
                            if (startIndex !== -1) {
                                const endIndex = line.indexOf('.', startIndex + 1);
                                if (endIndex != -1) {
                                    const profile = new QbsProfileData(line.substring(startIndex + 1, endIndex));
                                    if (profiles.map(profile => profile.name()).indexOf(profile.name()) === -1)
                                        profiles.push(profile);
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
                const debuggers: QbsDebuggerData[] = [];
                try {
                    const json = JSON.parse(data.toString());
                    const configurations = (json['configurations'] || []);
                    for (const configuration of configurations) {
                        debuggers.push(new QbsDebuggerData(configuration));
                    }
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
}
