import * as vscode from 'vscode';
import {basename} from 'path';

import {QbsSession} from './qbssession';
import {QbsProject} from './qbsproject';
import {QbsProfileData, QbsConfigData, QbsProductData, QbsDebuggerData} from './qbstypes';

export async function displayWorkspaceProjectSelector(session: QbsSession) {
    const projects = await QbsProject.enumerateWorkspaceProjects();
    interface QbsProjectQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
    }
    const items: QbsProjectQuickPickItem[] = projects.map(uri => {
        return {
            label: basename(uri.fsPath),
            uri
        };
    });
    const uri = await vscode.window.showQuickPick(items).then(item => {
        return item?.uri;
    });
    await session.setupProject(uri);
}

export async function displayProfileSelector(session: QbsSession) {
    const profiles = await session.settings().enumerateProfiles();
    interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
        profile: QbsProfileData;
    }
    const items: QbsProfileQuickPickItem[] = profiles.map(profile => {
        return {
            label: profile.name(),
            profile
        };
    });
    const selectedProfile = await vscode.window.showQuickPick(items).then(item => {
        return item?.profile;
    });
    session.project()?.buildStep().setup(selectedProfile, undefined, undefined);
}

export async function displayConfigurationSelector(session: QbsSession) {
    const configurations = await session.settings().enumerateConfigurations();
    interface QbsConfigQuickPickItem extends vscode.QuickPickItem {
        configuration: QbsConfigData;
    }
    const items: QbsConfigQuickPickItem[] = configurations.map(configuration => {
        return {
            label: configuration.displayName() || 'oops',
            description: configuration.description(),
            configuration
        };
    });
    const selectedConfiguration = await vscode.window.showQuickPick(items).then(item => {
        return item?.configuration;
    });
    if (selectedConfiguration?.name() !== 'custom') {
        session.project()?.buildStep().setup(undefined, selectedConfiguration, undefined);
    } else {
        const customConfigurationName = await vscode.window.showInputBox({
            value: 'custom',
            placeHolder: 'Enter custom configuration name',
        });
        const selectedCustomConfiguration = customConfigurationName
            ? new QbsConfigData(customConfigurationName) : undefined;
        session.project()?.buildStep().setup(undefined, selectedCustomConfiguration, undefined);
    }
}

export async function displayBuildProductSelector(session: QbsSession) {
    const products = [
        new QbsProductData('all'),
        ...session.project()?.products() || []
    ];
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProductData;
    }
    const items: QbsProductQuickPickItem[] = products?.map(product => {
        return {
            label: product.isEmpty() ? '[all]' : product.fullDisplayName(),
            product
        };
    });
    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });
    session.project()?.buildStep().setup(undefined, undefined, selectedProduct);
}

export async function displayRunProductSelector(session: QbsSession) {
    const products = (session.project()?.products() || [])
        .filter(product => product.isRunnable());
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProductData;
    }
    const items: QbsProductQuickPickItem[] = products.map(product => {
        return {
            label: product.fullDisplayName(),
            product
        };
    });
    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });
    session.project()?.runStep().setup(selectedProduct, undefined, undefined);
}

export async function displayDebuggerSelector(session: QbsSession) {
    const dbgs = (await session.settings().enumerateDebuggers()) || [];
    interface QbsDebuggerQuickPickItem extends vscode.QuickPickItem {
        dbg: QbsDebuggerData;
    }
    const items: QbsDebuggerQuickPickItem[] = dbgs.map(dbg => {
    return {
        label: dbg.name(),
        dbg
    };
    });
    const selectedDbg = await vscode.window.showQuickPick(items).then(item => {
        return item?.dbg;
    });
    session.project()?.runStep().setup(undefined, selectedDbg, undefined);
}
