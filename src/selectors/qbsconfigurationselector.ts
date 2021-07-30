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
            label: configuration.displayName()  || configuration.name(),
            description: configuration.description(),
            configuration
        };
    });

    const selectedConfiguration = await vscode.window.showQuickPick(items).then(item => {
        return item?.configuration;
    });

    session.project()?.buildStep().setup(undefined, selectedConfiguration, undefined);
}
