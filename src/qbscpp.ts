/**
 * @file This file implements the custom intelli sense provider.
 */

import * as vscode from 'vscode';
import * as cpt from 'vscode-cpptools';

import {QbsSession} from './qbssession';

import {QbsModulePropertiesData} from './datatypes/qbsmodulepropertiesdata';
import {QbsProjectData} from './datatypes/qbsprojectdata';

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

    constructor(session: QbsSession) {
        session.onProjectResolved(async (result) => {
            if (result.isEmpty()) {
                await this.setup(session.project()?.data());
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
        const items: cpt.SourceFileConfigurationItem[] = [];
        for (const uri of uris) {
            const configuration = this._sourceFileConfigurations.get(uri.toString());
            if (configuration) {
                items.push({uri, configuration});
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

    private async setup(project?: QbsProjectData) {
        if (!project) {
            return;
        }
        if (!this._api) {
            this._api = await cpt.getCppToolsApi(cpt.Version.v4);
        }
        if (!this._api) {
            return;
        }

        await this.buildSourceFileConfigurations(project);

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

    private async buildSourceFileConfigurations(project: QbsProjectData) {
        // Where the map is <source file path, configuration>.
        this._sourceFileConfigurations = new Map<string, cpt.SourceFileConfiguration>();
        const parseProject = async (project: QbsProjectData) => {
            const products = project.products();
            for (const product of products) {
                const productModuleProperties = product.moduleProperties();
                const groups = product.groups();
                for (const group of groups) {
                    const groupModuleProperties = group.moduleProperties();
                    const sources = group.sourceArtifacts();
                    for (const source of sources) {
                        const filepath = source.filePath();
                        const tags = source.fileTags();
                        const includePath = groupModuleProperties.isValid()
                            ? groupModuleProperties.allIncludePaths() : productModuleProperties.allIncludePaths();
                        const compilerDefines = this.guessCompilerDefines(groupModuleProperties.isValid()
                            ? groupModuleProperties : productModuleProperties, tags);
                        const productDefines = groupModuleProperties.isValid()
                            ? groupModuleProperties.allDefines() : productModuleProperties.allDefines();
                        const defines = [...compilerDefines, ...productDefines];
                        const forcedInclude = groupModuleProperties.isValid()
                            ? groupModuleProperties.prefixHeaders() : productModuleProperties.prefixHeaders();
                        const compilerPath = groupModuleProperties.isValid()
                            ? groupModuleProperties.compilerPath() : productModuleProperties.compilerPath();
                        const intelliSenseMode = this.guessIntelliSenseMode(groupModuleProperties.isValid()
                            ? groupModuleProperties : productModuleProperties);
                        const standard = this.guessLanguageStandard(groupModuleProperties.isValid()
                            ? groupModuleProperties : productModuleProperties, tags);
                        const cfg: cpt.SourceFileConfiguration = {
                            includePath,
                            defines,
                            intelliSenseMode,
                            standard,
                            forcedInclude,
                            compilerPath
                        };
                        this._sourceFileConfigurations.set(vscode.Uri.file(filepath).toString(), cfg);
                    }
                }
            }

            const subProjects = project.subProjects();
            for (const subProject of subProjects) {
                await parseProject(subProject);
            }
        };

        await parseProject(project);
    }

    /**
     * Returns the required language standard for the intelli sense
     * engine determines from the QBS product @c properties and the
     * QBS file @c tags.
     */
    private guessLanguageStandard(properties: QbsModulePropertiesData, tags: string[]): LanguageStandard {
        if (tags.indexOf('cpp') !== -1 || tags.indexOf('hpp')) {
            const languageVersion = properties.cxxLanguageVersion();
            if (languageVersion.length) {
                return languageVersion[0] as LanguageStandard;
            } else {
                // FIXME: We need to determine the correct version
                // of the compiler for the supported standard.
                // Because all current values are taken approximately.
                const toolchain = properties.toolchain();
                const major = properties.compilerVersionMajor();
                const minor = properties.compilerVersionMinor();
                const patch = properties.compilerVersionPatch();
                const architecture = properties.architecture();
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
            const languageVersion = properties.cLanguageVersion();
            if (languageVersion.length) {
                return languageVersion[0] as LanguageStandard;
            } else {
                // FIXME: We need to determine the correct version
                // of the compiler for the supported standard.
                // Because all current values are taken approximately.
                const toolchain = properties.toolchain();
                const major = properties.compilerVersionMajor();
                const minor = properties.compilerVersionMinor();
                const patch = properties.compilerVersionPatch();
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

        return 'c++98';
    }

    /**
     * Returns the required intelli sense mode for the intelli sense
     * engine determines from the QBS product @c properties.
     */
    private guessIntelliSenseMode(properties: QbsModulePropertiesData): IntelliSenseMode {
        const architecture = properties.architecture();
        const toolchain = properties.toolchain();
        if (architecture && toolchain.length) {
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
            } else if (toolchain.indexOf('keil') !== -1) {
                if (architecture.indexOf('arm') !== -1) {
                    const compilerName = properties.compilerName();
                    // Use closer value to KEIL ARM compiler intelli sense mode.
                    return (compilerName.indexOf('armclang') === -1) ? 'gcc-arm' : 'clang-arm';
                }
            }
        }
        return 'gcc-x86';
    }

    private guessCompilerDefines(properties: QbsModulePropertiesData, tags: string[]) {
        const toolchain = properties.toolchain();
        // Don't handle the known compilers (like MSVC, Clang, GCC), because
        // its pre-defined macros will be detected by the `cpp-tools` plugin engine.
        if (toolchain.indexOf('msvc') !== -1 || toolchain.indexOf('gcc') !== -1 || toolchain.indexOf('clang') !== -1) {
            return [];
        }

        const compilerDefinesByLanguage = (language: string) => {
            const definesByLanguage = properties.compilerDefinesByLanguage(language);
            if (!definesByLanguage) {
                return [];
            }
            const compilerDefines = [];
            for (var defineByLanguage in definesByLanguage) {
                compilerDefines.push(defineByLanguage + "=" + definesByLanguage[defineByLanguage]);
            }
            return compilerDefines;
        };

        let compilerDefines : string[] = [];
        tags.forEach(tag => {
            if (compilerDefines.length > 0) {
                return;
            }
            const definesByLanguage = compilerDefinesByLanguage(tag);
            if (definesByLanguage.length > 0) {
                compilerDefines = definesByLanguage;
            }
        });
        return compilerDefines;
    }
}
