import * as vscode from 'vscode';

import * as QbsUtils from './qbsutils';

export async function selectProject(): Promise<vscode.Uri | undefined> {
    interface ProjectQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
    }
    const projects = await QbsUtils.enumerateProjects();
    const items: ProjectQuickPickItem[] = projects.map(project => {
        return {
            label: QbsUtils.fileBaseName(project),
            uri: project
        };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.uri;
    });
}

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

export async function selectBuild(project: any): Promise<string | undefined> {
    interface ProductQuickPickItem extends vscode.QuickPickItem {
        fullDisplayName: string;
    }
    const products = [{
        fullDisplayName: 'all'
    }].concat(await QbsUtils.enumerateProducts(project));
    const items: ProductQuickPickItem[] = products.map(product => {
        return {
            label: (product.fullDisplayName === 'all') ? '[all]' : product.fullDisplayName,
            fullDisplayName: product.fullDisplayName
        };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.fullDisplayName;
    });
}

export async function selectRun(project: any): Promise<string | undefined> {
    const products = (await QbsUtils.enumerateProducts(project))
        .filter(product => product.targetExecutable);
    const items: vscode.QuickPickItem[] = products.map(product => {
        return {
            label: product.fullDisplayName,
        };
    });
    return await vscode.window.showQuickPick(items).then(item => {
        return item?.label;
    });
}
