import * as vscode from 'vscode';

import * as QbsUtils from './qbsutils';

export function fetchQbsPath(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('qbsPath') as string;
    return QbsUtils.expandPath(v) || '';
}

export function fetchQbsSettingsDirectory(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('settingsDirectory') as string;
    return QbsUtils.expandPath(v) || '';
}

export function fetchQbsBuildDirectory(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('buildDirectory') as string;
    return QbsUtils.expandPath(v) || '';
}

export function fetchQbsKeepGoing(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('keepGoing') as boolean;
    return v || false;
}

export function fetchQbsMaxJobs(): number {
    const v = vscode.workspace.getConfiguration('qbs').get('maxBuildJobs') as number;
    return v || 0;
}

export function fetchQbsShowCommandLines(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('showCommandLines') as boolean;
    return v || false;
}

export function fetchQbsForceProbes(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('forceProbes') as boolean;
    return v || false;
}

export function fetchQbsCleanInstallRoot(): boolean {
    const v = vscode.workspace.getConfiguration('qbs').get('cleanInstallRoot') as boolean;
    return v || false;
}

export function fetchQbsErrorHandlingMode(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('errorHandlingMode') as string;
    return v || 'relaxed';
}

export function fetchQbsLogLevel(): string {
    const v = vscode.workspace.getConfiguration('qbs').get('logLevel') as string;
    return v || 'info';
}
