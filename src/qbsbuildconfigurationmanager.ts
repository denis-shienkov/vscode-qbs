import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { ensureFileCreated } from './qbsutils';
import { QbsBuildConfigurationData } from './datatypes/qbsbuildconfigurationdata';
import { QbsBuildConfigurationKey } from './datatypes/qbsbuildconfigurationkey';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsSettings } from './qbssettings';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsBuildConfigurationManager implements vscode.Disposable {
    private static instance: QbsBuildConfigurationManager;
    private configurations: QbsBuildConfigurationData[] = [];
    private updated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private configurationSelected: vscode.EventEmitter<QbsBuildConfigurationData>
        = new vscode.EventEmitter<QbsBuildConfigurationData>();
    private fsBuildConfigurationsWatcher?: chokidar.FSWatcher
    private disposable?: vscode.Disposable;

    readonly onUpdated: vscode.Event<void> = this.updated.event;
    readonly onConfigurationSelected: vscode.Event<QbsBuildConfigurationData>
        = this.configurationSelected.event;

    public static getInstance(): QbsBuildConfigurationManager {
        return QbsBuildConfigurationManager.instance;
    }

    public constructor(context: vscode.ExtensionContext) {
        QbsBuildConfigurationManager.instance = this;
        this.registerCommandsHandlers(context);
    }

    public dispose(): void { this.stop(); }

    public getConfigurations(): QbsBuildConfigurationData[] { return this.configurations; }

    public findConfiguration(configurationName?: string): QbsBuildConfigurationData | undefined {
        return this.getConfigurations().find(configuration => configuration.name === configurationName);
    }

    public async start(): Promise<void> {
        console.log('Starting build configuration manager');
        const subscribeBuildConfigurationsChanged = async () => {
            const fsProjectPath = QbsProjectManager.getInstance().getProject()?.getFsPath();
            if (!fsProjectPath)
                return;
            const fsPath = QbsBuildConfigurationManager.getFullBuildConfigurationsFilePath(fsProjectPath);
            if (!fsPath)
                return;
            console.log('Build configurations file name changed to: ' + fsPath);
            this.fsBuildConfigurationsWatcher = chokidar.watch(fsPath, { ignoreInitial: true });
            this.fsBuildConfigurationsWatcher.on('change', () => {
                console.log('Build configurations file content changed');
                this.scanConfigurations();
            });
        }

        this.disposable?.dispose();
        this.disposable = QbsSettings.observeSetting(QbsSettings.SettingKey.BuildConfigurationsFilePath,
            async () => subscribeBuildConfigurationsChanged());
        await subscribeBuildConfigurationsChanged();
    }

    public async stop(): Promise<void> {
        console.log('Stopping build configuration manager');
        await this.fsBuildConfigurationsWatcher?.close();
        await this.disposable?.dispose();
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ScanBuildConfigurations,
            async () => { await this.scanConfigurations(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectBuildConfiguration,
            async () => { await this.selectConfiguration(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.EditBuildConfigurations,
            async () => { await QbsBuildConfigurationManager.editConfigurations(); }));
    }

    private async scanConfigurations(): Promise<void> {
        const fsPath = QbsBuildConfigurationManager.ensureConfigurationsCreated();
        if (!fsPath)
            return;
        return new Promise<QbsBuildConfigurationData[]>((resolve) => {
            console.log('Start reading build configurations from: ' + fsPath);
            fs.readFile(fsPath, (error, data) => {
                if (error) {
                    resolve([]);
                } else {
                    const result = (jsonc.parse(data.toString()))
                        .filter((entry: any) => entry[QbsBuildConfigurationKey.Name])
                        .map((entry: any) => {
                            const name = entry[QbsBuildConfigurationKey.Name];
                            const display = entry[QbsBuildConfigurationKey.DisplayName];
                            const descr = entry[QbsBuildConfigurationKey.Description];
                            const props = entry[QbsBuildConfigurationKey.Properties];
                            return new QbsBuildConfigurationData(name, display, descr, props);
                        });
                    resolve(result);
                }
            });
        }).then(async (configurations) => {
            this.configurations = configurations;
            console.log('Reading build configurations completed, found: ' + configurations.length + ' configurations');
            this.updated.fire();
        });
    }

    private async selectConfiguration(): Promise<void> {
        interface QbsConfigurationQuickPickItem extends vscode.QuickPickItem {
            configuration: QbsBuildConfigurationData | undefined;
        }
        const items: QbsConfigurationQuickPickItem[] = [
            ...[{
                label: localize('qbs.buildconfigurationmanager.scan.select.label',
                    '[Scan build configurations]'),
                description: localize('qbs.buildconfigurationmanager.scan.select.description',
                    'Scan available build configurations'),
                configuration: undefined
            }],
            ...this.configurations.map((configuration) => {
                const label = configuration.displayName || configuration.name;
                return { label, description: configuration.description, configuration };
            })
        ];

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        else if (!chosen.configuration) // Scan configurations item was choosed by the user.
            await this.scanConfigurations();
        else // Configuration was choosed by the user.
            this.configurationSelected.fire(chosen.configuration);
    }

    private static async editConfigurations(): Promise<void> {
        // Create if not exists yet, and then show the `qbs-configurations.json` file.
        const fsPath = QbsBuildConfigurationManager.ensureConfigurationsCreated();
        if (!fsPath)
            return;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
        await vscode.window.showTextDocument(doc);
    }

    private static ensureConfigurationsCreated(): string | undefined {
        const fsProjectPath = QbsProjectManager.getInstance().getProject()?.getFsPath();
        if (!fsProjectPath)
            return;
        const fsPath = this.getFullBuildConfigurationsFilePath(fsProjectPath);
        if (!fsPath)
            return;
        ensureFileCreated(fsPath, QbsBuildConfigurationManager.writeDefaultConfigurations);
        return fsPath;
    }

    private static getDefaultConfigurations(): QbsBuildConfigurationData[] {
        return [
            {
                'name': 'release',
                'displayName': 'Release',
                'description': 'Build with optimizations.',
                'properties': {
                    'qbs.defaultBuildVariant': 'release'
                }
            },
            {
                'name': 'debug',
                'displayName': 'Debug',
                'description': 'Build with debug information.',
                'properties': {
                    'qbs.defaultBuildVariant': 'debug'
                }
            },
            {
                'name': 'profiling',
                'displayName': 'Profiling',
                'description': 'Build with optimizations and debug information.',
                'properties': {
                    'qbs.defaultBuildVariant': 'profiling'
                }
            }
        ];
    }

    private static writeDefaultConfigurations(ws: fs.WriteStream): boolean {
        ws.write(JSON.stringify(QbsBuildConfigurationManager.getDefaultConfigurations(), null, 4));
        return true;
    }

    private static getFullBuildConfigurationsFilePath(fsProjectPath: string): string | undefined {
        const sourceRoot = QbsSettings.getSourceRootDirectory(fsProjectPath);
        if (!sourceRoot) {
            vscode.window.showWarningMessage(localize('qbs.buildconfigurationmanager.noworkspace.message',
                'Unable get the build configurations file because no any workspace folder is open.'));
            return;
        }
        const result = QbsSettings.getBuildConfigurationsFilePath();
        if (!result) {
            vscode.window.showWarningMessage(localize('qbs.buildconfigurationmanager.nofspath.message',
                'Unable to get the build configurations file because its path is not set in Qbs extension settings.'));
            return;
        }
        return QbsSettings.substituteSourceRoot(result, sourceRoot);
    }
}
