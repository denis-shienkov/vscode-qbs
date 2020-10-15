import * as vscode from 'vscode';
import * as cpt from 'vscode-cpptools';

import * as QbsUtils from './qbsutils';
import {QbsSession} from './qbssession';

export class QbsCppConfigurationProvider implements cpt.CustomConfigurationProvider {
    readonly name = 'QBS';
    readonly extensionId = 'ms-vscode.qbs-tools';

    private _api?: cpt.CppToolsApi;
    private _registered?: Promise<void>;
    private _sourceFileConfigurations = new Map<string, cpt.SourceFileConfiguration>();
 
    constructor(readonly session: QbsSession) {
        session.onProjectResolved(result => {
            this.setup(session.fetchProjectData());
        });
    }

    async canProvideConfiguration(uri: vscode.Uri): Promise<boolean> {
        const has = this._sourceFileConfigurations.has(uri.toString());
        return has;
    }

    async provideConfigurations(uris: vscode.Uri[]): Promise<cpt.SourceFileConfigurationItem[]> {
        let items: cpt.SourceFileConfigurationItem[] = [];
        for (const uri of uris) {
            const configuration = this._sourceFileConfigurations.get(uri.toString());
            if (configuration) {
                items.push({uri: uri, configuration: configuration});
            }
        }
        return items;
     }

    async canProvideBrowseConfiguration(): Promise<boolean> { 
        return false; 
    }

    async provideBrowseConfiguration(): Promise<cpt.WorkspaceBrowseConfiguration> { 
        return {browsePath: []}; 
    }

    async canProvideBrowseConfigurationsPerFolder(): Promise<boolean> { 
        return false; 
    }

    async provideFolderBrowseConfiguration(uri: vscode.Uri): Promise<cpt.WorkspaceBrowseConfiguration> {
        return {browsePath: []};
    }

    dispose() { 
        if (this._api) {
            this._api.dispose();
        }
    }

    private async setup(data: any) {
        if (!this._api) {
            this._api = await cpt.getCppToolsApi(cpt.Version.v4);
        }
        if (!this._api) {
            return;
        }

        await this.buildSourceFileConfigurations(data);
        
        // Ensure that the provider is already registered.
        if (!this._registered) {
            this._api.registerCustomConfigurationProvider(this);
        }

        if (this._api.notifyReady) {
            this._api.notifyReady(this);
        } else {
            this._api.didChangeCustomConfiguration(this);
        }
    }

    private async buildSourceFileConfigurations(data: any) {
        // Where the map is <source file path, configuration>.
        this._sourceFileConfigurations = new Map<string, cpt.SourceFileConfiguration>();
        const parseProject = (project: any) => {
            const products = project['products'] || [];
            for (const product of products) {
                const moduleProperties = product['module-properties'];
                const groups = product['groups'] || [];
                for (const group of groups) {
                    const sources = group['source-artifacts'] || [];
                    for (const source of sources) {
                        const filepath = source['file-path'];
                        const tags = source['file-tags'];
                        const includePath = QbsUtils.extractIncludePaths(moduleProperties);
                        const defines = QbsUtils.extractDefines(moduleProperties);
                        const forcedInclude = QbsUtils.extractPrefixHeaders(moduleProperties);
                        const compilerPath = QbsUtils.extractCompilerPath(moduleProperties);
                        const intelliSenseMode = QbsUtils.extractIntelliSenseMode(moduleProperties);
                        const standard = QbsUtils.extractLanguageStandard(moduleProperties, tags);
                        const cfg: cpt.SourceFileConfiguration = {
                            includePath: includePath,
                            defines: defines,
                            intelliSenseMode: intelliSenseMode,
                            standard: standard,
                            forcedInclude: forcedInclude,
                            compilerPath: compilerPath
                        };
                        this._sourceFileConfigurations.set(vscode.Uri.file(filepath).toString(), cfg);
                    }
                }
            }

            const subProjects = project['sub-projects'] || [];
            for (const subProject of subProjects) {
                parseProject(subProject);
            }
        };

        parseProject(data);
    }
}
