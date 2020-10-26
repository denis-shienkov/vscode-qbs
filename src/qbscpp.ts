/**
 * @file This file implements the custom intelli sense provider.
 */

import * as vscode from 'vscode';
import * as cpt from 'vscode-cpptools';

import {QbsSession} from './qbssession';

/**
 * Supported language standards by the intelli sense engine.
 */
type LanguageStandard = 'c89' | 'c99' | 'c11' | 'c18' | 'gnu89' | 'gnu99' | 'gnu11' | 'gnu18'
                        | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20'
                        | 'gnu++98' | 'gnu++03' | 'gnu++11' | 'gnu++14' | 'gnu++17' | 'gnu++20';

/**
 * Supported intelli sense modes by the intelli sense engine.
 */
type IntelliSenseMode = 'msvc-x86' | 'msvc-x64' | 'msvc-arm' | 'msvc-arm64'
                        | 'gcc-x86' | 'gcc-x64' | 'gcc-arm' | 'gcc-arm64'
                        | 'clang-x86' | 'clang-x64' | 'clang-arm' | 'clang-arm64';

/**
 * Custom intelli sense provider for the QBS plugin.
 *
 * @note We need in this class for the correct highlighting of the
 * includes, defines and other stuff for the opened project sources.
 */
export class QbsCpp implements cpt.CustomConfigurationProvider {
    readonly name = 'QBS';
    readonly extensionId = 'ms-vscode.qbs-tools';

    private _api?: cpt.CppToolsApi;
    private _registered: boolean = false;
    private _sourceFileConfigurations = new Map<string, cpt.SourceFileConfiguration>();

    constructor(readonly session: QbsSession) {
        session.onProjectResolved(result => {
            if (result.isEmpty()) {
                this.setup(session.project()?.data());
            }
        });
    }

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
    async canProvideConfiguration(uri: vscode.Uri): Promise<boolean> {
        const has = this._sourceFileConfigurations.has(uri.toString());
        return has;
    }

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
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

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
    async canProvideBrowseConfiguration(): Promise<boolean> { return false; }

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
    async provideBrowseConfiguration(): Promise<cpt.WorkspaceBrowseConfiguration> { return {browsePath: []}; }

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
    async canProvideBrowseConfigurationsPerFolder(): Promise<boolean> { return false; }

    /**
     * @note From the cpt.CustomConfigurationProvider interface.
     */
    async provideFolderBrowseConfiguration(uri: vscode.Uri): Promise<cpt.WorkspaceBrowseConfiguration> { return {browsePath: []}; }

    dispose() {
        if (this._api) {
            this._api.dispose();
        }
    }

    /**
     * Re-initializes the provider configuration from the
     * resolved QBS project @c data.
     *
     * @note Gets called when the QBS session resolves the new opened
     * project.
     */
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
            this._registered = true;
        }

        if (this._api.notifyReady) {
            this._api.notifyReady(this);
        } else {
            this._api.didChangeCustomConfiguration(this);
        }
    }

    /**
     * Enumerates all project source files and fills the information
     * required for the intelli sense engine from the resolved QBS
     * project @c data paroperty.
     */
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
                        const includePath = this.extractIncludePaths(moduleProperties);
                        const defines = this.extractDefines(moduleProperties);
                        const forcedInclude = this.extractPrefixHeaders(moduleProperties);
                        const compilerPath = this.extractCompilerPath(moduleProperties);
                        const intelliSenseMode = this.extractIntelliSenseMode(moduleProperties);
                        const standard = this.extractLanguageStandard(moduleProperties, tags);
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

    /**
     * Returns the required language standard for the intelli sense
     * engine determines from the QBS product @c properties and the
     * QBS file @c tags.
     */
    private extractLanguageStandard(properties?: any, tags?: string[]): LanguageStandard {
        if (properties && tags) {
            if (tags.indexOf('cpp') !== -1) {
                const languageVersion = properties['cpp.cxxLanguageVersion'];
                if (languageVersion && languageVersion.length > 0) {
                    return languageVersion[0];
                } else {
                    // FIXME: We need to determine the correct version
                    // of the compiler for the supported standard.
                    // Because all current values are taken approximately.
                    const toolchain = properties['qbs.toolchain'];
                    const major = properties['cpp.compilerVersionMajor'] || 0;
                    const minor = properties['cpp.compilerVersionMinor'] || 0;
                    const patch = properties['cpp.compilerVersionPatch'] || 0;
                    const architecture = properties['qbs.architecture'] || [];
                    if (toolchain.indexOf('msvc') !== -1) {
                        return 'c++11';
                    } else if (toolchain.indexOf('clang') !== -1) {
                        if (major >= 10) {
                            return 'c++20';
                        } else if (major >= 5) {
                            return 'c++17';
                        } else if (major > 3 || (major === 3 && minor > 4)) {
                            return 'c++14';
                        } else if (major > 3 || (major === 3 && minor > 3)) {
                            return 'c++11';
                        } else {
                            return 'c++03';
                        }
                    } else if (toolchain.indexOf('gcc') !== -1) {
                        if (major >= 11) {
                            return 'c++17';
                        } else if (major > 6 || (major === 6 && minor > 1)) {
                            return 'c++14';
                        } else if (major > 4 || (major === 4 && minor > 8)
                                || (major === 4 && minor == 8 && patch > 1)) {
                            return 'c++11';
                        } else {
                            return 'c++03';
                        }
                    } else if (toolchain.indexOf('iar') !== -1) {
                        return 'c++03';
                    } else if (toolchain.indexOf('keil') !== -1
                                && architecture.indexOf('arm') !== -1) {
                        if (major >= 5) {
                            return 'c++11';
                        } else {
                            return 'c++03';
                        }
                    }
                }
            } else if (tags.indexOf('c') !== -1) {
                const languageVersion = properties['cpp.cLanguageVersion'];
                if (languageVersion && languageVersion.length > 0) {
                    return languageVersion[0];
                } else {
                    // FIXME: We need to determine the correct version
                    // of the compiler for the supported standard.
                    // Because all current values are taken approximately.
                    const toolchain = properties['qbs.toolchain'];
                    const major = properties['cpp.compilerVersionMajor'] || 0;
                    const minor = properties['cpp.compilerVersionMinor'] || 0;
                    const patch = properties['cpp.compilerVersionPatch'] || 0;
                    if (toolchain.indexOf('msvc') !== -1) {
                        return 'c99';
                    } else if (toolchain.indexOf('clang') !== -1) {
                        if (major >= 5) {
                            return 'c99';
                        } else {
                            return 'c89';
                        }
                    } else if (toolchain.indexOf('gcc') !== -1) {
                        if (major >= 11) {
                            return 'c11';
                        } else if (major > 6 || (major === 6 && minor > 1)) {
                            return 'c11';
                        } else if (major > 4 || (major === 4 && minor > 8)
                                    || (major === 4 && minor == 8 && patch > 1)) {
                            return 'c99';
                        } else {
                            return 'c89';
                        }
                    } else if (toolchain.indexOf('iar') !== -1) {
                        return 'c99';
                    } else if (toolchain.indexOf('keil') !== -1) {
                        if (major >= 5) {
                            return 'c99';
                        } else {
                            return 'c89';
                        }
                    } else if (toolchain.indexOf('sdcc') !== -1) {
                        if (major >= 3) {
                            return 'c11';
                        } else {
                            return 'c99';
                        }
                    }
                }
            }
        } else if (tags) {
            if (tags.indexOf('cpp') !== -1) {
                return 'c++03';
            } else if (tags.indexOf('c') !== -1) {
                return 'c89';
            }
        }
        return 'c++98';
    }

    /**
     * Returns the list of the full pre-include header paths
     * obtained from the QBS product @c properties.
     */
    private extractPrefixHeaders(properties?: any): string[] {
        return properties ? ([].concat(properties['cpp.prefixHeaders'])) : [];
    }

    /**
     * Returns the list of the full include paths
     * obtained from the QBS product @c properties.
     */
    private extractIncludePaths(properties?: any): string[] {
        return properties ? ([]
            .concat(properties['cpp.compilerIncludePaths'])
            .concat(properties['cpp.distributionIncludePaths'])
            .concat(properties['cpp.systemIncludePaths'])
            .concat(properties['cpp.includePaths'])
            .concat(properties['cpp.frameworkPaths'])
            .concat(properties['cpp.systemFrameworkPaths'])) : [];
    }

    /**
     * Returns the list of the defines obtained from the
     * QBS product @c properties.
     */
    private extractDefines(properties?: any): string[] {
        return properties ? ([].concat(properties['cpp.defines'])) : [];
    }

    /**
     * Returns the full compiler path obtained from the
     * QBS product @c properties.
     */
    private extractCompilerPath(properties?: any): string {
        return properties ? (properties['cpp.compilerPath'] || '') : '';
    }

    /**
     * Returns the required intelli sense mode for the intelli sense
     * engine determines from the QBS product @c properties.
     */
    private extractIntelliSenseMode(properties?: any): IntelliSenseMode {
        if (properties) {
            const architecture = properties['qbs.architecture'];
            const toolchain = properties['qbs.toolchain'];
            if (architecture && toolchain && toolchain.length > 0) {
                if (toolchain.indexOf('msvc') !== -1) {
                    if (architecture === 'x86') {
                        return 'msvc-x86';
                    } else if (architecture === 'x86_64') {
                        return 'msvc-x64';
                    } else if (architecture.indexOf('arm') !== -1) {
                        return (architecture.indexOf('64') !== -1) ? 'msvc-arm64' : 'msvc-arm';
                    }
                } else if (toolchain.indexOf('clang') !== -1
                            || toolchain.indexOf('clang-cl') !== -1
                            || toolchain.indexOf('llvm') !== -1) {
                    if (architecture === 'x86') {
                        return 'clang-x86';
                    } else if (architecture === 'x86_64') {
                        return 'clang-x64';
                    } else if (architecture.indexOf('arm') !== -1) {
                        return (architecture.indexOf('64') !== -1) ? 'clang-arm64' : 'clang-arm';
                    }
                } else if (toolchain.indexOf('gcc') !== -1
                            || toolchain.indexOf('mingw') !== -1) {
                    if (architecture === 'x86') {
                        return 'gcc-x86';
                    } else if (architecture === 'x86_64') {
                        return 'gcc-x64';
                    } else if (architecture.indexOf('arm') !== -1) {
                        return (architecture.indexOf('64') !== -1) ? 'gcc-arm64' : 'gcc-arm';
                    }
                } else if (toolchain.indexOf('iar') !== -1) {
                    if (architecture.indexOf('arm') !== -1) {
                        // Use closer value to IAR ARM compiler intelli sense mode.
                        return 'gcc-arm';
                    }
                } else if (toolchain.indexOf('sdcc') !== -1) {
                    if (architecture.indexOf('arm') !== -1) {
                        const compilerName = properties['cpp.compilerName'] || '';
                        // Use closer value to KEIL ARM compiler intelli sense mode.
                        return (compilerName.indexOf('armclang') === -1) ? 'gcc-arm' : 'clang-arm';
                    }
                }
            }
        }
        return 'gcc-x86';
    }
}
