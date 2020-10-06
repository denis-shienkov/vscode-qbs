import * as vscode from 'vscode';

export async function enumerateProjects(): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles('*.qbs');
}

export async function enumerateBuildProfiles(): Promise<string[]> {
    return ['msvc', 'gcc'];
}

export async function enumerateBuildConfigurations(): Promise<string[]> {
    return ['debug', 'release'];
}


