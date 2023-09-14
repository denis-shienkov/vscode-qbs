import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { ensureFileCreated, ensureFileUpdated } from './qbsutils';
import { QbsSpecificBuildConfigurationData, QbsAllBuildConfigurationData } from './datatypes/qbsbuildconfigurationdata';
import { QbsBuildConfigurationKey } from './datatypes/qbsbuildconfigurationkey';
import { QbsBuildVariant } from './datatypes/qbsbuildvariant';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsSettings } from './qbssettings';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const currentConfigurationVersion = '1';

export class QbsBuildConfigurationManager implements vscode.Disposable {
    private static instance: QbsBuildConfigurationManager;
    private configuration: QbsAllBuildConfigurationData = QbsBuildConfigurationManager.getDefaultConfiguration();
    private updated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private configurationSelected: vscode.EventEmitter<QbsSpecificBuildConfigurationData>
        = new vscode.EventEmitter<QbsSpecificBuildConfigurationData>();
    private fsBuildConfigurationsWatcher?: chokidar.FSWatcher
    private disposable?: vscode.Disposable;

    readonly onUpdated: vscode.Event<void> = this.updated.event;
    readonly onConfigurationSelected: vscode.Event<QbsSpecificBuildConfigurationData>
        = this.configurationSelected.event;

    public static getInstance(): QbsBuildConfigurationManager {
        return QbsBuildConfigurationManager.instance;
    }

    public constructor(context: vscode.ExtensionContext) {
        QbsBuildConfigurationManager.instance = this;
        this.registerCommandsHandlers(context);
    }

    public dispose(): void { this.stop(); }

    public getConfiguration(): QbsAllBuildConfigurationData | undefined { return this.configuration; }

    public findSpecificConfiguration(configurationName?: string): QbsSpecificBuildConfigurationData | undefined {
        const configurations = this.configuration[QbsBuildConfigurationKey.Configurations];
        let specific = configurations.find(configuration => configuration.name === configurationName);
        if (!specific)
            specific = configurations.find(specific => specific.name === QbsBuildVariant.Debug);
        return specific;
    }

    public findCommonProperties(): { [key: string]: string } | undefined {
        const properties = this.configuration[QbsBuildConfigurationKey.Properties];
        return properties;
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
        return new Promise<QbsAllBuildConfigurationData>((resolve) => {
            console.log('Start reading build configurations from: ' + fsPath);
            fs.readFile(fsPath, (error, data) => {
                if (error) {
                    console.log('Unable to read build configurations from: ' + fsPath);
                    resolve(QbsBuildConfigurationManager.getDefaultConfiguration());
                } else {
                    const extractConfiguration = (): QbsAllBuildConfigurationData => {
                        const content = jsonc.parse(data.toString());
                        const version = content[QbsBuildConfigurationKey.Version];
                        if (!version)
                            return QbsBuildConfigurationManager.migrateBuildConfigurationFromVersion0(fsPath, content);
                        switch (version) {
                            case currentConfigurationVersion:
                                return QbsBuildConfigurationManager.migrateBuildConfigurationFromVersion1(fsPath, content);
                            default:
                                return QbsBuildConfigurationManager.migrateBuildConfigurationFromVersionUnknown(fsPath, content);
                        }
                    };
                    const configuration = extractConfiguration();
                    resolve(configuration);
                }
            });
        }).then(async (configuration) => {
            this.configuration = configuration;
            console.log('Reading build configurations completed, found: ' + configuration.configurations.length + ' configurations');
            this.updated.fire();
        });
    }

    private async selectConfiguration(): Promise<void> {
        interface QbsSpecificConfigurationQuickPickItem extends vscode.QuickPickItem {
            specific: QbsSpecificBuildConfigurationData | undefined;
        }
        const items: QbsSpecificConfigurationQuickPickItem[] = [
            ...[{
                label: localize('qbs.buildconfigurationmanager.scan.select.label',
                    '[Scan build configurations]'),
                description: localize('qbs.buildconfigurationmanager.scan.select.description',
                    'Scan available build configurations'),
                specific: undefined
            }],
            ...(this.configuration.configurations).map((specific) => {
                const label = specific.displayName || specific.name;
                return { label, description: specific.description, specific };
            })
        ];

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        else if (!chosen.specific) // Scan configurations item was choosed by the user.
            await this.scanConfigurations();
        else // Configuration was choosed by the user.
            this.configurationSelected.fire(chosen.specific);
    }

    private static async editConfigurations(): Promise<void> {
        // Create if not exists yet, and then show the `qbs-configurations.json` file.
        const fsPath = QbsBuildConfigurationManager.ensureConfigurationsCreated();
        if (!fsPath)
            return;
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
        await vscode.window.showTextDocument(doc);
    }

    private static migrateBuildConfigurationFromVersionUnknown(fsPath: string, content: any): QbsAllBuildConfigurationData {
        console.log('Migrate build configuration from version: unknown to current version: ' + currentConfigurationVersion);
        // Update file with default configurations.
        const data = QbsBuildConfigurationManager.getDefaultConfiguration();
        ensureFileUpdated(fsPath, data, QbsBuildConfigurationManager.writeConfigurations);
        return data;
    }

    private static migrateBuildConfigurationFromVersion0(fsPath: string, content: any): QbsAllBuildConfigurationData {
        console.log('Migrate build configuration from version: 0 to current version: ' + currentConfigurationVersion);
        const configurations = content
            .filter((entry: any) => entry[QbsBuildConfigurationKey.Name])
            .map((entry: any) => {
                const name = entry[QbsBuildConfigurationKey.Name];
                const display = entry[QbsBuildConfigurationKey.DisplayName];
                const descr = entry[QbsBuildConfigurationKey.Description];
                const props = entry[QbsBuildConfigurationKey.Properties];
                return new QbsSpecificBuildConfigurationData(name, display, descr, props);
            });
        const data = new QbsAllBuildConfigurationData(currentConfigurationVersion, configurations);
        ensureFileUpdated(fsPath, data, QbsBuildConfigurationManager.writeConfigurations);
        return data;
    }

    private static migrateBuildConfigurationFromVersion1(fsPath: string, content: any): QbsAllBuildConfigurationData {
        console.log('Migrate build configuration from version: 1 to current version: ' + currentConfigurationVersion);
        const configurations = content[QbsBuildConfigurationKey.Configurations]
            .filter((entry: any) => entry[QbsBuildConfigurationKey.Name])
            .map((entry: any) => {
                const name = entry[QbsBuildConfigurationKey.Name];
                const display = entry[QbsBuildConfigurationKey.DisplayName];
                const descr = entry[QbsBuildConfigurationKey.Description];
                const props = entry[QbsBuildConfigurationKey.Properties];
                return new QbsSpecificBuildConfigurationData(name, display, descr, props);
            });
        const properties = content[QbsBuildConfigurationKey.Properties];
        const data = new QbsAllBuildConfigurationData(currentConfigurationVersion, configurations, properties);
        return data;
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

    private static getDefaultConfiguration(): QbsAllBuildConfigurationData {
        return {
            'version': '1',
            'configurations': [
                {
                    'name': QbsBuildVariant.Release,
                    'displayName': 'Release',
                    'description': 'Build with optimizations.',
                    'properties': {
                        'qbs.defaultBuildVariant': QbsBuildVariant.Release
                    }
                },
                {
                    'name': QbsBuildVariant.Debug,
                    'displayName': 'Debug',
                    'description': 'Build with debug information.',
                    'properties': {
                        'qbs.defaultBuildVariant': QbsBuildVariant.Debug
                    }
                },
                {
                    'name': QbsBuildVariant.Profiling,
                    'displayName': 'Profiling',
                    'description': 'Build with optimizations and debug information.',
                    'properties': {
                        'qbs.defaultBuildVariant': QbsBuildVariant.Profiling
                    }
                }
            ]
        }
    }

    private static writeConfigurations(fd: number, data: QbsAllBuildConfigurationData): boolean {
        const content = JSON.stringify(data, null, 4);
        const bytes = fs.writeSync(fd, content);
        return (bytes > 0);
    }

    private static writeDefaultConfigurations(fd: number): boolean {
        return QbsBuildConfigurationManager.writeConfigurations(fd, QbsBuildConfigurationManager.getDefaultConfiguration());
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
