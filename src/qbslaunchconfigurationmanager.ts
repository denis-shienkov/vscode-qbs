import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { ensureFileCreated } from './qbsutils';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsLaunchConfigurationData } from './datatypes/qbslaunchconfigurationdata';
import { QbsLaunchConfigurationKey } from './datatypes/qbslaunchconfigurationkey';
import { QbsSettings } from './qbssettings';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsLaunchConfigurationManager implements vscode.Disposable {
    private static instance: QbsLaunchConfigurationManager;
    private configurations: QbsLaunchConfigurationData[] = [];
    private updated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private configurationSelected: vscode.EventEmitter<QbsLaunchConfigurationData | undefined> = new vscode.EventEmitter<QbsLaunchConfigurationData>();
    private fsLaunchConfigurationsWatcher?: chokidar.FSWatcher

    readonly onUpdated: vscode.Event<void> = this.updated.event;
    readonly onConfigurationSelected: vscode.Event<QbsLaunchConfigurationData | undefined> = this.configurationSelected.event;

    public static getInstance(): QbsLaunchConfigurationManager { return QbsLaunchConfigurationManager.instance; }

    public constructor(context: vscode.ExtensionContext) {
        QbsLaunchConfigurationManager.instance = this;

        // Create default launch configurations file if this file not exists yet.
        QbsLaunchConfigurationManager.ensureConfigurationsCreated();

        // Register the commands related to the profile manager.
        this.registerCommandsHandlers(context);
        this.subscribeSettingsChanges();
    }

    public dispose(): void { this.fsLaunchConfigurationsWatcher?.close(); }

    public getConfigurations(): QbsLaunchConfigurationData[] { return this.configurations; }

    public findConfiguration(configurationName?: string): QbsLaunchConfigurationData | undefined {
        return this.getConfigurations().find(configuration => configuration.getName() === configurationName);
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ScanLaunchConfigurations,
            async () => { await this.scanConfigurations(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectLaunchConfiguration,
            async () => { await this.selectConfiguration(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.EditLaunchConfigurations,
            async () => { await this.editConfigurations(); }));
    }

    private subscribeSettingsChanges(): void {
        const subscribeLaunchConfigurationsChanged = async () => {
            const fsPath = QbsSettings.substituteFsPath(QbsSettings.getLaunchFilePath());
            console.log('Launch configurations file name changed to: ' + fsPath);
            this.fsLaunchConfigurationsWatcher = chokidar.watch(fsPath, { ignoreInitial: true });
            this.fsLaunchConfigurationsWatcher.on('change', () => {
                console.log('Launch configurations file content changed');
                this.scanConfigurations();
            });
        }

        QbsSettings.observeSetting(QbsSettings.SettingKey.LaunchFilePath,
            async () => subscribeLaunchConfigurationsChanged());
        subscribeLaunchConfigurationsChanged();
    }

    private async scanConfigurations(): Promise<void> {
        return new Promise<QbsLaunchConfigurationData[]>((resolve) => {
            const fsPath = QbsLaunchConfigurationManager.ensureConfigurationsCreated();
            console.log('Start reading launch configurations from: ' + fsPath);
            fs.readFile(fsPath, (error, data) => {
                if (error) {
                    resolve([]);
                } else {
                    const result = ((jsonc.parse(data.toString()))[QbsLaunchConfigurationKey.Configutations] || [])
                        .filter((entry: any) => entry[QbsLaunchConfigurationKey.Name])
                        .map((entry: any) => { return new QbsLaunchConfigurationData(entry); });
                    resolve(result);
                }
            });
        }).then(async (configurations) => {
            this.configurations = configurations;
            console.log('Reading launch configurations completed, found: '
                + configurations.length + ' configurations');
            this.updated.fire();
        });
    }

    private async selectConfiguration(): Promise<void> {
        interface QbsConfigurationQuickPickItem extends vscode.QuickPickItem {
            configuration?: QbsLaunchConfigurationData;
            isAuto?: boolean;
        }
        const items: QbsConfigurationQuickPickItem[] = [
            ...[
                {
                    label: localize('qbs.launchconfigurationmanager.scan.select.label',
                        '[Scan launch configurations]'),
                    description: localize('qbs.launchconfigurationmanager.scan.select.description',
                        'Scan available launch configurations'),
                    configuration: undefined
                },
                {
                    label: localize('qbs.launchconfigurationmanager.auto.placeholder', 'Auto'),
                    description: localize('qbs.launchconfigurationmanager.auto.description', 'Select the Auto Launch Configuration'),
                    isAuto: true
                }
            ],
            ...this.configurations
                .filter((configuration) => configuration.getName())
                .map((configuration) => {
                    const label = configuration.getName() || 'oops';
                    const description = localize('qbs.launchconfigurationmanager.select.description',
                        'Type "{0}", request "{1}"', configuration.getType(), configuration.getRequest());
                    return { label, description, configuration };
                })
        ];

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) {
            // Choose was canceled by the user.
            return;
        } else if (!chosen.configuration && !chosen.isAuto) {
            // Scan configurations item was choosed by the user.
            await this.scanConfigurations();
        } else {
            // Configuration was choosed by the user (an undefined
            // configuration means an auto configuration).
            this.configurationSelected.fire(chosen.configuration);
        }
    }

    private async editConfigurations(): Promise<void> {
        // Create if not exists yet, and then show the `qbs-configurations.json` file.
        const fsPath = QbsLaunchConfigurationManager.ensureConfigurationsCreated();
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
        await vscode.window.showTextDocument(doc);
    }

    private static ensureConfigurationsCreated(): string {
        let fsPath = QbsSettings.getLaunchFilePath()
        fsPath = QbsSettings.substituteFsPath(fsPath);
        ensureFileCreated(fsPath, QbsLaunchConfigurationManager.writeDefaultConfigurations);
        return fsPath;
    }

    private static getDefaultConfigurations(): any {
        return {
            // Use IntelliSense to learn about possible attributes.
            // Hover to view descriptions of existing attributes.
            // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
            "version": "0.2.0",
            "configurations": []
        }
    }

    private static writeDefaultConfigurations(ws: fs.WriteStream): boolean {
        ws.write(JSON.stringify(QbsLaunchConfigurationManager.getDefaultConfigurations(), null, 4));
        return true;
    }
}
