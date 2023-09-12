import * as cpt from 'vscode-cpptools';
import * as vscode from 'vscode';

import { QbsArchitecture } from './protocol/qbsprotocolqbsmoduledata';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsExtensionKey } from './qbsextension';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsProtocolCppModuleData } from './protocol/qbsprotocolcppmoduledata';
import { QbsProtocolProjectData } from './protocol/qbsprotocolprojectdata';
import { QbsProtocolQbsModuleData } from './protocol/qbsprotocolqbsmoduledata';
import { QbsToolchain } from './protocol/qbsprotocolqbsmoduledata';

/** Supported language standards by the intelli sense engine. */
type LanguageStandard = 'c89' | 'c99' | 'c11' | 'gnu89' | 'gnu99' | 'gnu11' | 'c++98' | 'c++03'
    | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'gnu++98' | 'gnu++03' | 'gnu++11'
    | 'gnu++14' | 'gnu++17' | 'gnu++20';

/** Supported intelli sense modes by the intelli sense engine. */
type IntelliSenseMode = 'msvc-x86' | 'msvc-x64' | 'msvc-arm' | 'msvc-arm64'
    | 'gcc-x86' | 'gcc-x64' | 'gcc-arm' | 'gcc-arm64'
    | 'clang-x86' | 'clang-x64' | 'clang-arm' | 'clang-arm64';

/** Custom intelli sense provider for the Qbs extension. */
export class QbsCppCodeModel implements cpt.CustomConfigurationProvider {
    readonly name = 'Qbs';
    readonly extensionId = QbsExtensionKey.Id;

    private toolsApi?: cpt.CppToolsApi;
    private alreadyRegistered: boolean = false;
    private configurations = new Map<string, cpt.SourceFileConfiguration>();
    private disposable?: vscode.Disposable;

    public constructor(context: vscode.ExtensionContext) {
        this.registerCommandsHandlers(context);
        this.subscribeCppUpdateEvents();
    }

    public dispose() {
        this.toolsApi?.dispose();
        this.disposable?.dispose();
    }

    // From the cpt.CustomConfigurationProvider interface.

    public async canProvideConfiguration(uri: vscode.Uri): Promise<boolean> {
        const has = this.configurations.has(uri.toString());
        console.log('Can provide Cpptools configuration for ' + uri.toString() + ', ' + has);
        return has;
    }

    public async provideConfigurations(
        uris: vscode.Uri[],
        token?: vscode.CancellationToken): Promise<cpt.SourceFileConfigurationItem[]> {
        const configurations = (uris.filter(uri => this.configurations.get(uri.toString()))
            .map(uri => {
                return <cpt.SourceFileConfigurationItem>{
                    uri,
                    configuration: this.configurations.get(uri.toString())
                };
            }));
        if (token?.isCancellationRequested) {
            console.log('Cpptools timed out waiting for intellisense configurations. Requesting a refresh.');
            //this.toolsApi?.didChangeCustomConfiguration(this);
            return [];
        } else {
            console.log('Return ' + configurations.length + ' Cpptools configurations.');
            return configurations;
        }
    }

    public async canProvideBrowseConfiguration(): Promise<boolean> { return false; }
    public async provideBrowseConfiguration(): Promise<cpt.WorkspaceBrowseConfiguration> { return { browsePath: [] }; }
    public async canProvideBrowseConfigurationsPerFolder(): Promise<boolean> { return false; }
    public async provideFolderBrowseConfiguration(uri: vscode.Uri): Promise<cpt.WorkspaceBrowseConfiguration> { return { browsePath: [] }; }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.StartupCppCodeModel,
            async () => { await this.startup(); }));
    }

    private subscribeCppUpdateEvents(): void {
        QbsProjectManager.getInstance().onProjectOpen((async () => {
            this.disposable = QbsProjectManager.getInstance().getProject()?.onProjectDataChanged(
                async (projectData) => { this.update(projectData); });
        }));
    }

    private async startup(): Promise<void> {
        if (!this.toolsApi)
            this.toolsApi = await cpt.getCppToolsApi(cpt.Version.v4);
        if (!this.toolsApi) {
            vscode.window.showWarningMessage('Unable to get the MS Cpptools API. Intellisense may behave incorrectly.');
            return; // OOPS
        }
        if (!this.alreadyRegistered) {
            this.toolsApi.registerCustomConfigurationProvider(this);
            this.alreadyRegistered = true;
        }

        if (this.toolsApi.notifyReady)
            this.toolsApi.notifyReady(this);
    }

    private async update(projectData?: QbsProtocolProjectData): Promise<void> {
        if (!projectData || projectData.getIsEmpty())
            return;
        this.buildSourceFileConfigurations(projectData);
        this.toolsApi?.didChangeCustomConfiguration(this);
    }

    private async buildSourceFileConfigurations(projectData: QbsProtocolProjectData) {
        // Where the map is <source file path, configuration>.
        this.configurations = new Map<string, cpt.SourceFileConfiguration>();
        const parseProject = (projectData: QbsProtocolProjectData) => {
            projectData.getProducts().forEach(productData => {
                const productCppProps = productData.getModuleProperties()?.getCppModuleProperties();
                const productQbsProps = productData.getModuleProperties()?.getQbsModuleProperties();
                productData.getGroups().forEach(groupData => {
                    const groupCppProps = groupData.getModuleProperties()?.getCppModuleProperties();
                    const groupQbsProps = groupData.getModuleProperties()?.getQbsModuleProperties();

                    const identity = <U extends QbsProtocolCppModuleData, V extends QbsProtocolQbsModuleData>(
                        groupProps: U | V | undefined, productProps: U | V | undefined): U | V | undefined => {
                        return groupProps?.getIsValid() ? groupProps : productProps;
                    }

                    const cppProps = <QbsProtocolCppModuleData | undefined>(identity(groupCppProps, productCppProps));
                    const qbsProps = <QbsProtocolQbsModuleData | undefined>(identity(groupQbsProps, productQbsProps));
                    if (cppProps && qbsProps) {
                        const artifacts = [
                            ...groupData.getSourceArtifacts(),
                            ...groupData.getSourceWildcardArtifacts()
                        ];

                        artifacts.forEach(artifactData => {
                            const tags = artifactData.getFileTags();
                            const configuration: cpt.SourceFileConfiguration = {
                                includePath: [
                                    ...cppProps.getCompilerIncludePaths(),
                                    ...cppProps.getDistributionIncludePaths(),
                                    ...cppProps.getSystemIncludePaths(),
                                    ...cppProps.getIncludePaths(),
                                    ...cppProps.getFrameworkPaths(),
                                    ...cppProps.getSystemFrameworkPaths()
                                ],
                                defines: [
                                    ...this.getCompilerDefines(cppProps, qbsProps, tags),
                                    ...cppProps.getDefines(),
                                    ...cppProps.getPlatformDefines()
                                ],
                                intelliSenseMode: this.getIntelliSenseMode(cppProps, qbsProps),
                                standard: this.getLanguageStandard(cppProps, qbsProps, tags),
                                forcedInclude: cppProps.getPrefixHeaders(),
                                compilerPath: cppProps.getCompilerPath()
                            };
                            const fsPath = artifactData.getFilePath();
                            if (fsPath)
                                this.configurations.set(vscode.Uri.file(fsPath).toString(), configuration);
                        });
                    }
                })
            });

            projectData.getSubProjects().forEach(async (subProjectData) => parseProject(subProjectData));
        };

        parseProject(projectData);
    }

    /** Returns the required language standard for the intelli sense engine determines from
     * the Qbs product properties and the Qbs file tags. */
    private getLanguageStandard(
        cppProps: QbsProtocolCppModuleData,
        qbsProps: QbsProtocolQbsModuleData,
        tags: string[]): LanguageStandard {
        if (tags.includes('cpp') || tags.includes('hpp')) {
            const standard = this.getCppLanguageStandard(cppProps, qbsProps);
            if (standard)
                return standard;
        } else if (tags.includes('c')) {
            const standard = this.getCLanguageStandard(cppProps, qbsProps);
            if (standard)
                return standard;
        }
        return 'c++98';
    }

    private getCppLanguageStandard(
        cppProps: QbsProtocolCppModuleData,
        qbsProps: QbsProtocolQbsModuleData): LanguageStandard | undefined {
        const languageVersion = cppProps.getCxxLanguageVersion();
        if (languageVersion.length > 0)
            return languageVersion[0] as LanguageStandard;

        // FIXME: We need to determine the correct version of the compiler for the supported standard.
        // Because all current values are taken approximately.
        const { major, minor, patch } = this.getCompilerVersion(cppProps);
        const toolchain = qbsProps.getToolchain();
        const architecture = qbsProps.getArchitecture() || '';
        if (toolchain.includes(QbsToolchain.Msvc)) {
            return 'c++11';
        } else if (toolchain.includes(QbsToolchain.Clang)) {
            if (major >= 10)
                return 'c++20';
            else if (major >= 5)
                return 'c++17';
            else if ((major > 3) || ((major === 3) && (minor > 4)))
                return 'c++14';
            else if ((major > 3) || ((major === 3) && (minor > 3)))
                return 'c++11';
            else
                return 'c++03';
        } else if (toolchain.includes(QbsToolchain.Gcc)) {
            if (major >= 11)
                return 'c++17';
            else if ((major > 6) || ((major === 6) && (minor > 1)))
                return 'c++14';
            else if ((major > 4) || ((major === 4) && (minor > 8)) || ((major === 4) && (minor == 8) && (patch > 1)))
                return 'c++11';
            else
                return 'c++03';
        } else if (toolchain.includes(QbsToolchain.Iar)) {
            return 'c++03';
        } else if (toolchain.includes(QbsToolchain.Keil) && architecture.includes(QbsArchitecture.Arm)) {
            return (major >= 5) ? 'c++11' : 'c++03';
        }
    }

    private getCLanguageStandard(
        cppProps: QbsProtocolCppModuleData,
        qbsProps: QbsProtocolQbsModuleData): LanguageStandard | undefined {
        const languageVersion = cppProps.getCLanguageVersion();
        if (languageVersion.length)
            return languageVersion[0] as LanguageStandard;

        // FIXME: We need to determine the correct version of the compiler for the supported standard.
        // Because all current values are taken approximately.
        const { major, minor, patch } = this.getCompilerVersion(cppProps);
        const toolchain = qbsProps.getToolchain();
        if (toolchain.includes(QbsToolchain.Msvc)) {
            return 'c99';
        } else if (toolchain.includes('clang')) {
            return (major >= 5) ? 'c99' : 'c89';
        } else if (toolchain.includes(QbsToolchain.Gcc)) {
            if (major >= 11)
                return 'c11';
            else if ((major > 6) || ((major === 6) && (minor > 1)))
                return 'c11';
            else if ((major > 4) || ((major === 4) && (minor > 8)) || ((major === 4) && (minor == 8) && (patch > 1)))
                return 'c99';
            else
                return 'c89';
        } else if (toolchain.includes(QbsToolchain.Iar)) {
            return 'c99';
        } else if (toolchain.includes(QbsToolchain.Keil)) {
            return (major >= 5) ? 'c99' : 'c89';
        } else if (toolchain.includes(QbsToolchain.Sdcc)) {
            return (major >= 3) ? 'c11' : 'c99';
        }
    }

    /** Returns the required intelli sense mode for the intelli sense engine determines
     * from the Qbs product properties. */
    private getIntelliSenseMode(cppProps: QbsProtocolCppModuleData, qbsProps: QbsProtocolQbsModuleData): IntelliSenseMode {
        const architecture = qbsProps.getArchitecture();
        const toolchain = qbsProps.getToolchain();
        if (architecture && toolchain.length) {
            if (toolchain.includes(QbsToolchain.Msvc)) {
                if (architecture === QbsArchitecture.X86)
                    return 'msvc-x86';
                else if (architecture === QbsArchitecture.X8664)
                    return 'msvc-x64';
                else if (architecture.includes(QbsArchitecture.Arm))
                    return (architecture.includes('64')) ? 'msvc-arm64' : 'msvc-arm';
            } else if (toolchain.includes(QbsToolchain.Clang) || toolchain.includes(QbsToolchain.ClangCl)
                || toolchain.includes(QbsToolchain.Llvm)) {
                if (architecture === QbsArchitecture.X86)
                    return 'clang-x86';
                else if (architecture === QbsArchitecture.X8664)
                    return 'clang-x64';
                else if (architecture.includes(QbsArchitecture.Arm))
                    return (architecture.includes('64')) ? 'clang-arm64' : 'clang-arm';
            } else if (toolchain.includes(QbsToolchain.Gcc) || toolchain.includes(QbsToolchain.MinGw)) {
                if (architecture === QbsArchitecture.X86)
                    return 'gcc-x86';
                else if (architecture === QbsArchitecture.X8664)
                    return 'gcc-x64';
                else if (architecture.includes(QbsArchitecture.Arm))
                    return (architecture.includes('64')) ? 'gcc-arm64' : 'gcc-arm';
            } else if (toolchain.includes(QbsToolchain.Iar)) {
                if (architecture.includes(QbsArchitecture.Arm)) {
                    // Use closer value to IAR ARM compiler intelli sense mode.
                    return 'gcc-arm';
                }
            } else if (toolchain.includes(QbsToolchain.Keil)) {
                if (architecture.includes(QbsArchitecture.Arm)) {
                    // Use closer value to KEIL ARM compiler intelli sense mode.
                    return (cppProps.getCompilerName()?.includes('armclang')) ? 'gcc-arm' : 'clang-arm';
                }
            }
        }
        return 'gcc-x86';
    }

    private getCompilerDefines(
        cppProps: QbsProtocolCppModuleData,
        qbsProps: QbsProtocolQbsModuleData,
        tags: string[]): string[] {

        // Don't handle the known compilers (like MSVC, Clang, GCC), because
        // its pre-defined macros will be detected by the `cpp-tools` plugin engine.
        const hasKnownToolchain = (): boolean => {
            const toolchain = qbsProps.getToolchain();
            return toolchain.includes(QbsToolchain.Clang) || toolchain.includes(QbsToolchain.Gcc)
                || toolchain.includes(QbsToolchain.Msvc);
        };
        if (hasKnownToolchain())
            return [];

        // Fetch the compiler defines from the Qbs engine.
        const getCompilerDefinesByLanguage = (tag: string) => {
            const definesByLanguage = cppProps.getCompilerDefinesByLanguage(tag);
            if (!definesByLanguage)
                return [];

            const compilerDefines = [];
            for (var defineByLanguage in definesByLanguage) {
                compilerDefines.push(defineByLanguage + '=' + definesByLanguage[defineByLanguage]);
            }
            return compilerDefines;
        };

        tags = ['c'];
        let compilerDefines: string[] = [];
        tags.forEach(tag => {
            if (compilerDefines.length > 0) {
                return;
            }
            const definesByLanguage = getCompilerDefinesByLanguage(tag);
            if (definesByLanguage.length > 0) {
                compilerDefines = definesByLanguage;
            }
        });
        return compilerDefines;
    }

    private getCompilerVersion(cppProps: QbsProtocolCppModuleData) {
        const major = cppProps.getCompilerVersionMajor() || 0;
        const minor = cppProps.getCompilerVersionMinor() || 0;
        const patch = cppProps.getCompilerVersionPatch() || 0;
        return { major, minor, patch };
    }
}
