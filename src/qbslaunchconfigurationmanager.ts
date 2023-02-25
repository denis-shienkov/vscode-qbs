import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { ensureFileCreated } from './qbsutils';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsLaunchConfigurationData } from './datatypes/qbslaunchconfigurationdata';
import { QbsLaunchConfigurationKey } from './datatypes/qbslaunchconfigurationkey';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsSettings } from './qbssettings';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsLaunchConfigurationManager implements vscode.Disposable {
    private static instance: QbsLaunchConfigurationManager;
    private configurations: QbsLaunchConfigurationData[] = [];
    private updated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private configurationSelected: vscode.EventEmitter<QbsLaunchConfigurationData | undefined> = new vscode.EventEmitter<QbsLaunchConfigurationData>();
    private fsLaunchConfigurationsWatcher?: chokidar.FSWatcher
    private disposable?: vscode.Disposable;

    readonly onUpdated: vscode.Event<void> = this.updated.event;
    readonly onConfigurationSelected: vscode.Event<QbsLaunchConfigurationData | undefined> = this.configurationSelected.event;

    public static getInstance(): QbsLaunchConfigurationManager { return QbsLaunchConfigurationManager.instance; }

    public constructor(context: vscode.ExtensionContext) {
        QbsLaunchConfigurationManager.instance = this;
        this.registerCommandsHandlers(context);
    }

    public dispose(): void { this.stop(); }

    public getConfigurations(): QbsLaunchConfigurationData[] { return this.configurations; }

    public findConfiguration(configurationName?: string): QbsLaunchConfigurationData | undefined {
        return this.getConfigurations().find(configuration => configuration.getName() === configurationName);
    }

    public async start(): Promise<void> {
        const subscribeLaunchConfigurationsChanged = async () => {
            const fsProjectPath = QbsProjectManager.getInstance().getProject()?.getFsPath();
            if (!fsProjectPath)
                return;
            const fsPath = QbsLaunchConfigurationManager.getFullLaunchConfigurationsFilePath(fsProjectPath);
            if (!fsPath)
                return;
            console.log('Launch configurations file name changed to: ' + fsPath);
            this.fsLaunchConfigurationsWatcher = chokidar.watch(fsPath, { ignoreInitial: true });
            this.fsLaunchConfigurationsWatcher.on('change', () => {
                console.log('Launch configurations file content changed');
                this.scanConfigurations();
            });
        }

        this.disposable?.dispose();
        this.disposable = QbsSettings.observeSetting(QbsSettings.SettingKey.LaunchFilePath,
            async () => subscribeLaunchConfigurationsChanged());
        await subscribeLaunchConfigurationsChanged();
    }

    public async stop(): Promise<void> {
        await this.fsLaunchConfigurationsWatcher?.close();
        await this.disposable?.dispose();
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ScanLaunchConfigurations,
            async () => { await this.scanConfigurations(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectLaunchConfiguration,
            async () => { await this.selectConfiguration(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.EditLaunchConfigurations,
            async () => { await QbsLaunchConfigurationManager.editConfigurations(); }));
    }

    private async scanConfigurations(): Promise<void> {
        return new Promise<QbsLaunchConfigurationData[]>((resolve) => {
            const fsPath = QbsLaunchConfigurationManager.ensureConfigurationsCreated();
            if (!fsPath)
                return;
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

    private static async editConfigurations(): Promise<void> {
        // Create if not exists yet, and then show the `qbs-configurations.json` file.
        const fsPath = QbsLaunchConfigurationManager.ensureConfigurationsCreated();
        if (!fsPath)
            return;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
        await vscode.window.showTextDocument(doc);
    }

    private static ensureConfigurationsCreated(): string | undefined {
        const fsProjectPath = QbsProjectManager.getInstance().getProject()?.getFsPath();
        if (!fsProjectPath)
            return;
        const fsPath = QbsLaunchConfigurationManager.getFullLaunchConfigurationsFilePath(fsProjectPath);
        if (!fsPath)
            return;
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

    private static writeDefaultConfigurations(fd: number): boolean {
        const data = JSON.stringify(QbsLaunchConfigurationManager.getDefaultConfigurations(), null, 4);
        const bytes = fs.writeSync(fd, data);
        return bytes > 0;
    }

    private static getFullLaunchConfigurationsFilePath(fsProjectPath: string): string | undefined {
        const sourceRoot = QbsSettings.getSourceRootDirectory(fsProjectPath);
        if (!sourceRoot) {
            vscode.window.showWarningMessage(localize('qbs.launchconfigurationmanager.noworkspace.message',
                'Unable get the launch configurations file because no any workspace folder is open.'));
            return;
        }
        const fsPath = QbsSettings.getLaunchFilePath();
        if (!fsPath) {
            vscode.window.showWarningMessage(localize('qbs.launchconfigurationmanager.nofspath.message',
                'Unable to get the launch configurations file because its path is not set in Qbs extension settings.'));
            return;
        }
        return QbsSettings.substituteSourceRoot(fsPath, sourceRoot);
    }
}
