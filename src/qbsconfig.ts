/**
 * @file This file contains a set of useful helper functions
 * to access to the QBS plugin's configuration settings.
 */

import * as vscode from 'vscode';

import * as QbsUtils from './qbsutils';

/**
 * Returns the path to the QBS executable obtained
 * from the plugin configuration.
 */
export function fetchQbsPath(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('qbsPath') as string;
    return QbsUtils.expandPath(v) || '';
}

/**
 * Returns the path to the custom QBS settings directory
 * obtained from the plugin configuration.
 */
export function fetchQbsSettingsDirectory(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('settingsDirectory') as string;
    return QbsUtils.expandPath(v) || '';
}

/**
 * Returns the path to the QBS build directory
 * obtained from the plugin configuration.
 */
export function fetchQbsBuildDirectory(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('buildDirectory') as string;
    return QbsUtils.expandPath(v) || '';
}

/**
 * Returns the value of the QBS 'keep-going' property
 * obtained from the plugin configuration.
 */
export function fetchQbsKeepGoing(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('keepGoing') as boolean;
    return v || false;
}

/**
 * Returns the value of the QBS 'max-build-jobs' property
 * obtained from the plugin configuration.
 */
export function fetchQbsMaxJobs(): number {
    const v = vscode.workspace.getConfiguration('qbs').get('maxBuildJobs') as number;
    return v || 0;
}

/**
 * Returns the value of the QBS 'show-command-line' property
 * obtained from the plugin configuration.
 */
export function fetchQbsShowCommandLines(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('showCommandLines') as boolean;
    return v || false;
}

/**
 * Returns the value of the QBS 'force-probes' property
 * obtained from the plugin configuration.
 */
export function fetchQbsForceProbes(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('forceProbes') as boolean;
    return v || false;
}

/**
 * Returns the value of the QBS 'clean-install-root' property
 * obtained from the plugin configuration.
 */
export function fetchQbsCleanInstallRoot(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('cleanInstallRoot') as boolean;
    return v || false;
}

/**
 * Returns the value of the QBS 'error-handling-mode' property
 * obtained from the plugin configuration.
 */
export function fetchQbsErrorHandlingMode(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('errorHandlingMode') as string;
    return v || 'relaxed';
}

/**
 * Returns the value of the QBS 'log-level' property
 * obtained from the plugin configuration.
 */
export function fetchQbsLogLevel(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('logLevel') as string;
    return v || 'info';
}

/**
 * Returns the full path to the 'launch.json' file
 * obtained from the plugin configuration.
 */
export function fetchLaunchFilePath(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('launchFilePath') as string;
    return QbsUtils.expandPath(v) || '';
}
