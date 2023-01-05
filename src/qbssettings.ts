import * as vscode from 'vscode';

import { fixFsPathSeparators } from './qbsutils';
import { QbsProtocolCommandEchoMode } from './protocol/qbsprotocolcommandechomode';
import { QbsProtocolErrorHandlingMode } from './protocol/qbsprotocolerrorhandlingmode';
import { QbsProtocolLogLevel } from './protocol/qbsprotocolloglevel';

export namespace QbsSettings {
    /** Set of the base substitution patterns. */
    export enum QbsSubstitutionPattern {
        ConfigurationName = '${configurationName}',
        ProfileName = '${profileName}',
        ProjectName = '${projectName}',
        SourceDirectory = '${sourceDirectory}',
    }

    /** Set of all unique Qbs extension settings sections defined in the `package.json` file. */
    export enum SettingKey {
        AutoResolve = 'autoResolve',
        BuildBeforeRun = 'buildBeforeRun',
        BuildConfigurationsFilePath = 'buildConfigurationsFilePath',
        BuildDirectory = 'buildDirectory',
        CleanInstallRoot = 'cleanInstallRoot',
        ClearOutputBeforeOperation = 'clearOutputBeforeOperation',
        CommandEchoMode = 'commandEchoMode',
        ErrorHandlingMode = 'errorHandlingMode',
        ForceProbes = 'forceProbes',
        InstallAfterBuild = 'installAfterBuild',
        KeepGoing = 'keepGoing',
        LaunchFilePath = 'launchFilePath',
        LogLevel = 'logLevel',
        MaxBuildJobs = 'maxBuildJobs',
        QbsPath = 'qbsPath',
        SaveBeforeBuild = 'saveBeforeBuild',
        SettingsDirectory = 'settingsDirectory',
        ShowDisabledProjectItems = 'showDisabledProjectItems',
    }

    export function observeSetting(field: SettingKey, callback: () => void): void {
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(qbsSettingsSection + '.' + field.toString()))
                callback();
        });
    }

    /** Returns the path to the Qbs executable from the extension settings. */
    export function getQbsPath(): string { return getString(SettingKey.QbsPath, 'qbs'); }

    /** Returns the path to the custom Qbs settings directory from the extension settings. */
    export function getSettingsDirectory(): string { return getString(SettingKey.SettingsDirectory, ''); }

    /** Returns the full path to the `launch.json` file from the extension settings. */
    export function getLaunchFilePath(): string {
        return getString(SettingKey.LaunchFilePath, qbsDefaultLaunchFilePath);
    }

    /** Returns the path to the Qbs build directory from the extension settings. */
    export function getBuildDirectory(): string {
        return getString(SettingKey.BuildDirectory, qbsDefaultBuildDirectoryPath);
    }

    /** Returns the path to the `qbs-configurations.json` file from the extension settings. */
    export function getBuildConfigurationsFilePath(): string {
        return getString(SettingKey.BuildConfigurationsFilePath, qbsDefaultBuildConfigurationsFilePath);
    }

    /** Returns the value of the Qbs `keep-going` property from the extension settings. */
    export function getKeepGoing(): boolean { return getBoolean(SettingKey.KeepGoing, false); }

    /** Returns the value of the Qbs `max-build-jobs` property from the extension settings. */
    export function getMaxJobs(): number { return getSettings().get<number>(SettingKey.MaxBuildJobs, 0); }

    /** Returns the value of the Qbs `command-echo-mode` property from the extension settings. */
    export function getCommandEchoMode(): QbsProtocolCommandEchoMode {
        return getSettings().get<QbsProtocolCommandEchoMode>(SettingKey.CommandEchoMode,
            QbsProtocolCommandEchoMode.Summary);
    }

    /** Returns the value of the Qbs `force-probes` property from the extension settings. */
    export function getForceProbes(): boolean { return getBoolean(SettingKey.ForceProbes, false); }

    /** Returns the value of the Qbs `clean-install-root` property  from the extension settings. */
    export function getCleanInstallRoot(): boolean { return getBoolean(SettingKey.CleanInstallRoot, false); }

    /** Returns the value of the Qbs `error-handling-mode` property from the extension settings. */
    export function getErrorHandlingMode(): QbsProtocolErrorHandlingMode {
        return getSettings().get<QbsProtocolErrorHandlingMode>(SettingKey.ErrorHandlingMode,
            QbsProtocolErrorHandlingMode.Relaxed);
    }

    /** Returns the value of the Qbs `log-level` property from the extension settings. */
    export function getLogLevel(): QbsProtocolLogLevel {
        return getSettings().get<QbsProtocolLogLevel>(SettingKey.LogLevel, QbsProtocolLogLevel.Info);
    }

    export function getShowDisabledProjectItems(): boolean {
        return getBoolean(SettingKey.ShowDisabledProjectItems, true);
    }

    export function getClearOutputBeforeOperation(): boolean {
        return getBoolean(SettingKey.ClearOutputBeforeOperation, false);
    }

    export function getSaveBeforeBuild(): boolean { return getBoolean(SettingKey.SaveBeforeBuild, true); }

    export function getAutoResolve(): boolean { return getBoolean(SettingKey.AutoResolve, true); }

    export function getBuildBeforeRun(): boolean { return getBoolean(SettingKey.BuildBeforeRun, true); }

    export function getInstallAfterBuild(): boolean { return getBoolean(SettingKey.InstallAfterBuild, true); }

    export function substituteFsPath(fsPath: string, projectName?: string, profileName?: string, configurationName?: string) {
        fsPath = fsPath.replace(QbsSubstitutionPattern.SourceDirectory, getSourceRootDirectory());
        fsPath = fsPath.replace(QbsSubstitutionPattern.ProjectName, projectName || qbsUnknownEntryPath);
        fsPath = fsPath.replace(QbsSubstitutionPattern.ProfileName, profileName || qbsUnknownEntryPath);
        fsPath = fsPath.replace(QbsSubstitutionPattern.ConfigurationName, configurationName || qbsUnknownEntryPath);
        return fixFsPathSeparators(fsPath);
    }

    // Private part.

    // The unique identifier for the Qbs extension settigns location.
    const qbsSettingsSection = 'qbs';

    // Placeholder defaults for the non-specifies Qbs extension settings.
    const qbsDefaultBuildDirectoryPath = `${QbsSubstitutionPattern.SourceDirectory}/build/${QbsSubstitutionPattern.ProfileName}_${QbsSubstitutionPattern.ConfigurationName}`;
    const qbsDefaultLaunchFilePath = `${QbsSubstitutionPattern.SourceDirectory}/.vscode/launch.json`;
    const qbsDefaultBuildConfigurationsFilePath = `${QbsSubstitutionPattern.SourceDirectory}/.vscode/qbs-configurations.json`;
    const qbsUnknownEntryPath = 'unknown';

    function getSettings(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(qbsSettingsSection);
    }

    function getBoolean(key: string, placeholder: boolean): boolean {
        return getSettings().get(key, placeholder);
    }

    function getString(key: string, placeholder: string): string {
        return getSettings().get<string>(key, placeholder);
    }

    function getSourceRootDirectory(): string {
        return (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
            ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    }
}
