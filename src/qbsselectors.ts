import * as vscode from 'vscode';
import {basename} from 'path';

import {QbsSession} from './qbssession';
import {QbsProject} from './qbsproject';
import {QbsProfile} from './qbsprofile';
import {QbsBuildConfiguration} from './qbsbuildconfiguration';
import {QbsProduct} from './qbsproduct';
import {QbsDebugger} from './qbsdebugger';

export async function displayWorkspaceProjectSelector(session: QbsSession) {
    const projects = await QbsProject.enumerateWorkspaceProjects();
    interface QbsProjectQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
    }
    const items: QbsProjectQuickPickItem[] = projects.map(uri => {
        return {
            label: basename(uri.fsPath),
            uri: uri
        };
    });
    const uri = await vscode.window.showQuickPick(items).then(item => {
        return item?.uri;
    });
    await session.setActiveProject(uri);
}

export async function displayProfileSelector(session: QbsSession) {
    const profiles = await QbsProfile.enumerateProfiles();
    interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
        profile: QbsProfile;
    }
    const items: QbsProfileQuickPickItem[] = profiles.map(profile => {
        return {
            label: profile.name(),
            profile: profile
        };
    });
    const selectedProfile = await vscode.window.showQuickPick(items).then(item => {
        return item?.profile;
    });
    session.project()?.buildStep().setProfile(selectedProfile);
}

export async function displayConfigurationSelector(session: QbsSession) {
    const configurations = await QbsBuildConfiguration.enumerateConfigurations();
    interface QbsConfigQuickPickItem extends vscode.QuickPickItem {
        configuration: QbsBuildConfiguration;
    }
    const items: QbsConfigQuickPickItem[] = configurations.map(configuration => {
        return {
            label: configuration.name(),
            configuration: configuration
        };
    });
    const selectedConfiguration = await vscode.window.showQuickPick(items).then(item => {
        return item?.configuration;
    });
    session.project()?.buildStep().setConfiguration(selectedConfiguration);
}

export async function displayBuildProductSelector(session: QbsSession) {
    const products = [
        new QbsProduct('all')
    ].concat(await session.project()?.products() || []);
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProduct;
    }
    const items: QbsProductQuickPickItem[] = products?.map(product => {
        return {
            label: product.isEmpty() ? '[all]' : product.fullDisplayName(),
            product: product
        };
    });
    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });
    session.project()?.buildStep().setProduct(selectedProduct);
}

export async function displayRunProductSelector(session: QbsSession) {
    const products = (await session.project()?.products() || []).filter(product => product.isRunnable());
    interface QbsProductQuickPickItem extends vscode.QuickPickItem {
        product: QbsProduct;
    }
    const items: QbsProductQuickPickItem[] = products.map(product => {
        return {
            label: product.fullDisplayName(),
            product: product
        };
    });
    const selectedProduct = await vscode.window.showQuickPick(items).then(item => {
        return item?.product;
    });
    session.project()?.runStep().setProduct(selectedProduct);
}

export async function displayDebuggerSelector(session: QbsSession) {
    const dbgs = (await QbsDebugger.enumerateDebuggers()) || [];
    interface QbsDebuggerQuickPickItem extends vscode.QuickPickItem {
        dbg: QbsDebugger;
    }
    const items: QbsDebuggerQuickPickItem[] = dbgs.map(dbg => {
    return {
        label: dbg.name(),
        dbg: dbg
    };
    });
    const selectedDbg = await vscode.window.showQuickPick(items).then(item => {
        return item?.dbg;
    });
    session.project()?.runStep().setDebugger(selectedDbg);
}
