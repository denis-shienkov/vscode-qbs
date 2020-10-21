import * as vscode from 'vscode';
import {basename} from 'path';

import {QbsSession} from './qbssession';
import {QbsProject} from './qbsproject';
import {QbsProfile, QbsConfig, QbsProduct, QbsDebugger} from './qbssteps';

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
    const profiles = await session.settings().enumerateProfiles();
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
    const configurations = await session.settings().enumerateConfigurations();
    interface QbsConfigQuickPickItem extends vscode.QuickPickItem {
        configuration: QbsConfig;
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
    ].concat(await session.project()?.enumerateProducts() || []);
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
    const products = (await session.project()?.enumerateProducts() || [])
        .filter(product => product.isRunnable());
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
    const dbgs = (await session.settings().enumerateDebuggers()) || [];
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
