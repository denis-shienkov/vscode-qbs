import * as vscode from 'vscode';

import * as QbsUtils from './qbsutils';

export async function selectProfile(): Promise<string | undefined> {
    const profiles = await QbsUtils.enumerateBuildProfiles();
    const items: vscode.QuickPickItem[] = profiles.map(profile => {
        return { label: profile };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.label;
    });
}

export async function selectConfiguration(): Promise<string | undefined> {
    const configurations = await QbsUtils.enumerateBuildConfigurations();
    const items: vscode.QuickPickItem[] = configurations.map(configuration => {
        return { label: configuration };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.label;
    });
}

export async function selectDebugger(): Promise<any | undefined> {
    interface DebuggerQuickPickItem extends vscode.QuickPickItem {
        config: any;
    }
    const configs = (await QbsUtils.enumerateDebuggers())
        .filter(config => config['name']);
    const items: DebuggerQuickPickItem[] = configs.map(config => {
        return {
            label: config['name'],
            config: config
        };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.config;
    });
}
