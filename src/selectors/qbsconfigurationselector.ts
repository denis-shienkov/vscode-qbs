import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsConfigData} from '../datatypes/qbsconfigdata';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

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
            placeHolder: localize('qbs.enter.custom.config.name', 'Enter custom configuration name'),
        });
        const selectedCustomConfiguration = customConfigurationName
            ? new QbsConfigData(customConfigurationName) : undefined;
        session.project()?.buildStep().setup(undefined, selectedCustomConfiguration, undefined);
    }
}
