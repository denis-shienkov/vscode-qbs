import * as vscode from 'vscode';

export async function enumerateQbsProjects(): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles('*.qbs');
}

export async function enumerateQbsBuildProfiles(): Promise<string[]> {
    return ['msvc', 'gcc'];
}

export async function enumerateQbsBuildConfigurations(): Promise<string[]> {
    return ['debug', 'release'];
}


