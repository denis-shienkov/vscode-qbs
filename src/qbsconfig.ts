import * as vscode from 'vscode';

// From user code.
import * as QbsUtils from './qbsutils';

export function fetchQbsPath(): string {
    const path = QbsUtils.expandPath(vscode.workspace.getConfiguration('qbs').get('qbsPath') as string) || '';
    return path;
}

export function fetchQbsSettingsDirectory(): string {
    const path = QbsUtils.expandPath(vscode.workspace.getConfiguration('qbs').get('settingsDirectory') as string) || '';
    return path;
}

export function fetchQbsBuildDirectory(): string {
    const path = QbsUtils.expandPath(vscode.workspace.getConfiguration('qbs').get('buildDirectory') as string) || '';
    return path;
}

export function fetchQbsKeepGoing(): boolean  {
    return vscode.workspace.getConfiguration('qbs').get('keepGoing') as boolean || false;
}

export function fetchQbsMaxJobs(): number  {
    return vscode.workspace.getConfiguration('qbs').get('maxBuildJobs') as number || 0;
}

export function fetchQbsShowCommandLines(): boolean  {
    return vscode.workspace.getConfiguration('qbs').get('showCommandLines') as boolean || false;
}

export function fetchQbsForceProbes(): boolean  {
    return vscode.workspace.getConfiguration('qbs').get('forceProbes') as boolean || false;
}
