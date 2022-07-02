import * as vscode from 'vscode';

import {QbsConfigData} from '../datatypes/qbsconfigdata';
import {QbsSession} from '../qbssession';

export async function displayConfigurationSelector(session: QbsSession) {
    const configurations = await session.settings().enumerateConfigurations();
    interface QbsConfigQuickPickItem extends vscode.QuickPickItem {
        configuration: QbsConfigData;
    }

    const items: QbsConfigQuickPickItem[] = configurations.map(configuration => {
        return {
            label: configuration.displayName  || configuration.name,
            description: configuration.description,
            configuration
        };
    });

    const selectedConfiguration = await vscode.window.showQuickPick(items).then(item => {
        return item?.configuration;
    });

    let profile = undefined;
    if (selectedConfiguration?.profile) {
        const profiles = await session.settings().enumerateProfiles();
        profile = profiles.find(p => p.name() === selectedConfiguration.profile);
    }

    session.project()?.buildStep().setup(profile, selectedConfiguration, undefined);
}
