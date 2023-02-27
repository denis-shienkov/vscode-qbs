import { basename } from 'path';
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as path from 'path';
import * as vscode from 'vscode';
import * as which from 'which';

import { escapeShell } from './qbsutils';
import { QbsBuildConfigurationManager } from './qbsbuildconfigurationmanager';
import { QbsBuildProfileManager } from './qbsbuildprofilemanager';
import { QbsBuildSystem, QbsBuildSystemTimeout } from './qbsbuildsystem';
import { QbsBuildVariant } from './datatypes/qbsbuildvariant';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsLaunchConfigurationConsole } from './datatypes/qbslaunchconfigurationdata';
import { QbsLaunchConfigurationData } from './datatypes/qbslaunchconfigurationdata';
import { QbsLaunchConfigurationManager } from './qbslaunchconfigurationmanager';
import { QbsLaunchConfigurationRequest } from './datatypes/qbslaunchconfigurationdata';
import { QbsLaunchConfigurationType } from './datatypes/qbslaunchconfigurationdata';
import { QbsProductType } from './datatypes/qbsproducttype';
import { QbsProject } from './qbsproject';
import { QbsProtocolProductData } from './protocol/qbsprotocolproductdata';
import { QbsProtocolRunEnvironmentData } from './protocol/qbsprotocolrunenvironmentdata';
import { QbsSettings } from './qbssettings';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

interface QbsProductQuickPickItem extends vscode.QuickPickItem {
    all?: boolean
}

export class QbsProjectManager implements vscode.Disposable {
    private static instance: QbsProjectManager;
    private project?: QbsProject
    private timer?: NodeJS.Timeout;

    private readonly projectOpen: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    private readonly qbsLastOpenFsProjectKey = 'Qbs.LastOpenProjectPath.Key';
    private readonly qbsStorageKey = 'Qbs.Storage.Key';
    private readonly qbsStoredFsProjectsKey = 'Qbs.StoredProjects.Key';
    private readonly qbsStoredBuildProfileNameKey = 'Qbs.StoredProfileName.Key';
    private readonly qbsStoredBuildConfigurationNameKey = 'Qbs.StoredConfigurationName.Key';
    private readonly qbsStoredBuildProductNameKey = 'Qbs.StoredBuildProductName.Key';
    private readonly qbsStoredLaunchProductNameKey = 'Qbs.StoredLaunchProductName.Key';
    private readonly qbsStoredDebuggerNameKey = 'Qbs.StoredDebuggerName.Key';
    private readonly qbsStoredProjectSaveDelay = 2000 // In milliseconds.

    public readonly onProjectOpen: vscode.Event<void> = this.projectOpen.event;

    public static getInstance(): QbsProjectManager { return QbsProjectManager.instance; }

    public constructor(private readonly context: vscode.ExtensionContext) {
        QbsProjectManager.instance = this;
        // Register the commands related to the project manager.
        this.registerCommandsHandlers(context);

        this.subscribeBuildProfilesChanges();
        this.subscribeBuildConfifurationsChanges();
        this.subscribeLaunchConfifurationsChanges();
    }

    public dispose(): void { this.project?.dispose(); }

    public getProject(): QbsProject | undefined { return this.project; }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        // Commands for project load/save/restore.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.LoadProject,
            async () => { await this.selectProject(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SaveProject,
            async () => { await this.delaySaveProject(this.qbsStoredProjectSaveDelay); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.RestoreProject,
            async () => { await this.restoreProject(); }));

        // Commands to select the build/run products.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectBuildProduct,
            async () => { await this.selectBuildProduct(); }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectRunProduct,
            async () => { await this.selectRunProduct(); }));

        // Commands to run/debug the product.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.RunProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                await this.runProduct(productNames ? productNames[0] : undefined);
            }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.DebugProduct,
            async (data) => {
                const productNames = QbsBuildSystem.getCommandProductNames(data);
                await this.debugProduct(productNames ? productNames[0] : undefined);
            }));

        // Substitution commands.
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetProductBuildDirectory,
            async () => {
                const productName = this.getProject()?.getLaunchProductName();
                const fsPath = this.getProject()?.findProduct(productName)?.getBuildDirectory();
                console.log('Get selected produt build directory: ' + fsPath);
                if (!fsPath)
                    throw new Error('Selected product build directory is undefined');
                return fsPath;
            }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetProductExecutablePath,
            async () => {
                const productName = this.getProject()?.getLaunchProductName();
                const fsPath = this.getProject()?.findProduct(productName)?.getTargetExecutable();
                console.log('Get selected produt target executable: ' + fsPath);
                if (!fsPath)
                    throw new Error('Selected product target executable is undefined');
                return fsPath;
            }));
    }

    // Selectet build profile.
    private subscribeBuildProfilesChanges() {
        QbsBuildProfileManager.getInstance().onProfileSelected(async (profile) => {
            this.project?.setProfileName(profile?.getName());
        });
    }

    // Selected build configuration.
    private subscribeBuildConfifurationsChanges() {
        QbsBuildConfigurationManager.getInstance().onConfigurationSelected(async (configuration) => {
            this.project?.setConfigurationName(configuration.name);
        });

        QbsBuildConfigurationManager.getInstance().onUpdated(async () => {
            QbsBuildSystem.getInstance().delayAutoResolve(QbsBuildSystemTimeout.AutoResolve);
        });
    }

    // Select launch configuration.
    private subscribeLaunchConfifurationsChanges() {
        QbsLaunchConfigurationManager.getInstance().onConfigurationSelected(async (configuration) => {
            this.project?.setDebuggerName(configuration?.getName());
        });
    }

    private async restoreProject(): Promise<void> {
        const storage = this.context.workspaceState.get<any>(this.qbsStorageKey, {});
        let fsPath: string = storage[this.qbsLastOpenFsProjectKey];
        if (!fsPath || !fs.existsSync(fsPath)) {
            const fsPaths = await QbsProjectManager.getWorkspaceProjects();
            fsPath = (fsPaths) ? fsPaths[0] : '';
        }

        if (fsPath)
            await this.openProject(fsPath);
    }

    private async selectProject(): Promise<void> {
        interface QbsProjectQuickPickItem extends vscode.QuickPickItem {
            fsPath: string;
        }
        const fsPaths = await QbsProjectManager.getWorkspaceProjects();
        const items: QbsProjectQuickPickItem[] = fsPaths.map(fsPath => {
            return { label: basename(fsPath), description: path.dirname(fsPath), fsPath };
        });

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        await this.openProject(chosen.fsPath);
    }

    private createProductQuickPickElement(productData: QbsProtocolProductData): QbsProductQuickPickItem {
        const executable = productData.getTargetExecutable();
        return {
            label: productData.getFullDisplayName() || '',
            description: QbsProjectManager.getLocalizedProductType(productData.getType()),
            detail: executable ? basename(executable) : undefined
        };
    }

    private async selectBuildProduct(): Promise<void> {
        const items: QbsProductQuickPickItem[] = [
            ...[
                {
                    label: localize('qbs.select.build.all.label', 'ALL'),
                    detail: localize('qbs.select.build.all.description', 'Build all available products'),
                    all: true
                }
            ],
            ...(this.getProject()?.getAllRecursiveProducts() || [])
                .filter(productData => productData.getFullDisplayName())
                .map(productData => this.createProductQuickPickElement(productData))
        ];

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        const fullName = chosen.all ? undefined : chosen.label;
        console.log('Choosen build product: ' + fullName);
        this.getProject()?.setBuildProductName(fullName);
    }

    private async selectRunProduct(): Promise<void> {
        const items: QbsProductQuickPickItem[] = (this.getProject()?.getAllRecursiveProducts() || [])
            .filter(productData => productData.getIsRunnable())
            .map(productData => this.createProductQuickPickElement(productData));

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        const fullName = chosen.all ? undefined : chosen.label;
        console.log('Choosen run product: ' + fullName);
        this.getProject()?.setLaunchProductName(fullName);
    }

    private async runProduct(productName?: string): Promise<boolean> {
        const product = await this.ensureProductReadyToRun(productName);
        const executable = product?.getTargetExecutable();
        if (!product || !executable || !productName)
            return false;
        console.log('Running product: ' + productName + ', executable: ' + executable);

        const env = await QbsBuildSystem.getInstance().fetchProductRunEnvironment(productName);
        const terminal = vscode.window.createTerminal({
            name: 'Qbs Run',
            env,
            cwd: product.getBuildDirectory()
        });

        if (process.platform === 'darwin') {
            // Workaround for macOS system integrity protection.
            for (const specialEnv of ['DYLD_LIBRARY_PATH', 'DYLD_FRAMEWORK_PATH']) {
                if (env[specialEnv])
                    terminal.sendText(`export ${specialEnv}=${escapeShell(env[specialEnv])}`);
            }
        }
        const program = escapeShell(executable);
        terminal.sendText(program);
        terminal.show();
        return true;
    }

    private async debugProduct(productName?: string): Promise<boolean> {
        const product = await this.ensureProductReadyToRun(productName);
        const executable = product?.getTargetExecutable();
        if (!product || !executable || !productName)
            return false;
        console.log('Debugging product: ' + productName + ', executable: ' + executable);

        const configurationName = QbsProjectManager.getInstance().getProject()?.getDebuggerName();
        let configuration = QbsLaunchConfigurationManager.getInstance().findConfiguration(configurationName);
        if (configuration) {
            // TODO: DO something.
        } else {
            // An undefined launch configuration means that the selected debugger is `Auto`.
            configuration = new QbsLaunchConfigurationData({});

            const moduleProps = product?.getModuleProperties();
            if (!moduleProps)
                throw new Error('Unable to start auto debugging session because the module properties is undefined');
            const toolchain = moduleProps.getQbsModuleProperties()?.getToolchain();
            if (!toolchain)
                throw new Error('Unable to start auto debugging session because the toolchain is undefined');
            const compilerPath = moduleProps.getCppModuleProperties()?.getCompilerPath();
            if (!compilerPath)
                throw new Error('Unable to start auto debugging session because the compiler path is undefined');

            // Set debugger.
            if (toolchain.includes('msvc')) {
                configuration.setType(QbsLaunchConfigurationType.VisualStudio);
            } else if (toolchain.indexOf('gcc') !== -1) {
                configuration.setType(QbsLaunchConfigurationType.Gdb);

                const getFsDebugger = async (toolchainPath: string, debuggerName: string): Promise<string | undefined> => {
                    const ext = (process.platform === 'win32') ? '.exe' : '';
                    let fsPath: string | undefined = path.join(toolchainPath, debuggerName + ext);
                    if (!fs.existsSync(fsPath))
                        fsPath = await QbsProjectManager.which(debuggerName + ext);
                    return fsPath;
                };

                const setupMi = async (toolchainDir: string, debuggerName: string, miMode: string): Promise<boolean> => {
                    const fsPath = await getFsDebugger(toolchainDir, debuggerName);
                    if (!fsPath)
                        return false;
                    configuration?.setMiMode(miMode);
                    configuration?.setMiDebuggerPath(fsPath);
                    return true;
                }

                const setupDebugger = async (): Promise<boolean> => {
                    const compilerDirectory = path.dirname(compilerPath);

                    // Check for the LLDB-MI debugger executable.
                    if (await setupMi(compilerDirectory, 'lldb-mi', 'lldb'))
                        return true;

                    // Check for the LLDB-MI installed by CppTools.
                    const cpptoolsExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
                    const fsPath = cpptoolsExtension ? path.join(
                        cpptoolsExtension.extensionPath, 'debugAdapters', 'lldb-mi', 'bin') : undefined;
                    if (fsPath && await setupMi(fsPath, 'lldb-mi', 'lldb'))
                        return true;

                    // Check for the GDB debugger executable.
                    if (await setupMi(compilerDirectory, 'gdb', 'gdb'))
                        return true;

                    // Check for the LLDB debugger executable.
                    if (await setupMi(compilerDirectory, 'lldb', 'lldb'))
                        return true;
                    return false;
                }

                if (!await setupDebugger())
                    throw new Error('Unable to start auto debugging session because the debugger is undefined');
            }
        }

        // Override some launch configuration properties if they are empty.
        if (!configuration.getRequest())
            configuration.setRequest(QbsLaunchConfigurationRequest.Launch);
        if (!configuration.getProgram())
            configuration.setProgram(executable);
        if (!configuration.getCwd())
            configuration.setCwd(path.dirname(executable));
        if (!configuration.getConsole())
            configuration.setConsole(QbsLaunchConfigurationConsole.IntegratedTerminal);

        if (!configuration.getEnvironment()) {
            const env = await QbsBuildSystem.getInstance().fetchProductRunEnvironment(productName);
            configuration.setEnvironment(new QbsProtocolRunEnvironmentData(env));
        }

        return await vscode.debug.startDebugging(undefined, configuration.getData());
    }

    private async ensureProductReadyToRun(productName?: string): Promise<QbsProtocolProductData | undefined> {
        if (!productName) {
            vscode.window.showErrorMessage(localize('qbs.product.name.missed.error.message',
                'Run product name missing, please choose a product to run.'));
            return;
        } else if (QbsSettings.getBuildBeforeRun()) {
            const success = await QbsBuildSystem.getInstance().buildWithProgress(
                [productName], QbsBuildSystemTimeout.None);
            if (!success)
                return;
        }

        const product = this.getProject()?.findProduct(productName);
        if (!product) {
            vscode.window.showErrorMessage(localize('qbs.product.missed.error.message',
                'Run product not found, please re-configure the project.'));
            return;
        } else if (!product.getIsRunnable()) {
            vscode.window.showErrorMessage(localize('qbs.product.notexecutable.error.message',
                'Run product is not runnable, please re-configure the project.'));
            return;
        } else if (!product.getTargetExecutable()) {
            vscode.window.showErrorMessage(localize('qbs.product.executable.missed.error.message',
                'Run product executable missing, please re-build the product.'));
            return;
        }
        return product;
    }

    private async openProject(fsPath: string): Promise<void> {
        this.project = new QbsProject(fsPath);
        await this.loadProject();

        // Reload the build configurations for this new loaded project.
        await QbsBuildConfigurationManager.getInstance().restart();
        await vscode.commands.executeCommand(QbsCommandKey.ScanBuildConfigurations);

        // Reload the launch configurations for this new loaded project.
        await QbsLaunchConfigurationManager.getInstance().restart();
        await vscode.commands.executeCommand(QbsCommandKey.ScanLaunchConfigurations);

        this.projectOpen.fire();
    }

    private async loadProject(): Promise<void> {
        if (!this.project)
            return;
        const storage: any = this.context.workspaceState.get<any>(this.qbsStorageKey, {});
        const projects: any = (storage) ? storage[this.qbsStoredFsProjectsKey] : undefined;
        const project: any = (projects) ? projects[this.project?.getFsPath()] : undefined;
        this.project.setProfileName((project) ? project[this.qbsStoredBuildProfileNameKey] : undefined);
        this.project.setConfigurationName((project) ? project[this.qbsStoredBuildConfigurationNameKey] : QbsBuildVariant.Debug);
        this.project.setBuildProductName((project) ? project[this.qbsStoredBuildProductNameKey] : undefined);
        this.project.setLaunchProductName((project) ? project[this.qbsStoredLaunchProductNameKey] : undefined);
        this.project.setDebuggerName((project) ? project[this.qbsStoredDebuggerNameKey] : undefined);
    }

    private async saveProject(): Promise<void> {
        if (!this.project)
            return;
        let project: any = {};
        project[this.qbsStoredBuildProfileNameKey] = this.project.getProfileName();
        project[this.qbsStoredBuildConfigurationNameKey] = this.project.getConfigurationName();
        project[this.qbsStoredBuildProductNameKey] = this.project.getBuildProductName();
        project[this.qbsStoredLaunchProductNameKey] = this.project.getLaunchProductName();
        project[this.qbsStoredDebuggerNameKey] = this.project.getDebuggerName();
        let storage = this.context.workspaceState.get<any>(this.qbsStorageKey, {});
        let projects = storage[this.qbsStoredFsProjectsKey] || {};
        projects[this.project?.getFsPath()] = project;
        storage[this.qbsStoredFsProjectsKey] = projects;
        storage[this.qbsLastOpenFsProjectKey] = this.project.getFsPath();
        await this.context.workspaceState.update(this.qbsStorageKey, storage);
    }

    private async delaySaveProject(delay: number) {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = setTimeout(async () => {
            await this.saveProject();
            this.timer = undefined;
        }, delay);
    }

    /** Returns the list of paths of all found Qbs project files with the `*.qbs`
     * extension in the current workspace directory. */
    private static async getWorkspaceProjects(): Promise<string[]> {
        return (await vscode.workspace.findFiles('*.qbs')).map(uri => uri.fsPath);
    }

    private static async which(name: string): Promise<string | undefined> {
        return new Promise<string | undefined>(resolve => {
            which(name, (error, path) => {
                if (error) {
                    console.error('Unable to run "which ' + name + 'bs" command, error: ' + error.message);
                    resolve(undefined);
                } else {
                    resolve(path);
                }
            });
        });
    }

    private static getLocalizedProductType(type: string[]): string {
        if (type.includes(QbsProductType.Application))
            return localize('qbs.product.type.application', 'Application');
        else if (type.includes(QbsProductType.DynamicLibrary))
            return localize('qbs.product.type.dynamiclibrary', 'Dynamic Library');
        else if (type.includes(QbsProductType.StaticLibrary))
            return localize('qbs.product.type.staticlibrary', 'Static Library');
        return localize('qbs.product.type.custom', 'Custom');
    }
}
