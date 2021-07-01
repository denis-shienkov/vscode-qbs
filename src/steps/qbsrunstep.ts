import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as which from 'which';

import {QbsProject} from '../qbsproject';

import {QbsConfigData} from '../datatypes/qbsconfigdata';
import {QbsDebuggerData} from '../datatypes/qbsdebuggerdata';
import {QbsProductData} from '../datatypes/qbsproductdata';
import {QbsProfileData} from '../datatypes/qbsprofiledata';

import {QbsGetRunEnvironmentRequest} from '../datatypes/qbsgetrunenvironmentrequest';

export class QbsBuildStep implements vscode.Disposable {
    private _profile: QbsProfileData = new QbsProfileData();
    private _config: QbsConfigData = new QbsConfigData('debug');
    private _product: QbsProductData = new QbsProductData('');
    private _onChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    readonly onChanged: vscode.Event<boolean> = this._onChanged.event;

    constructor (private readonly _project: QbsProject) {}

    dispose() {}

    project(): QbsProject { return this._project; }
    profileName(): string { return this._profile.name(); }
    configurationName(): string { return this._config.name(); }
    productName(): string { return this._product.fullDisplayName(); }

    async restore() {
        const group = `${this._project.name()}::`;
        const profile = await this.extractProfile(group);
        const configuration = await this.extractConfiguration(group);
        const product = await this.extractProduct(group);
        await this.setup(profile, configuration, product);
    }

    async save() {
        const group = `${this._project.name()}::`;
        const profileName = this.profileName();
        if (profileName) {
            await this._project.session().extensionContext().workspaceState.update(`${group}BuildProfileName`, profileName);
        }
        const configurationName = this.configurationName();
        if (configurationName) {
            await this._project.session().extensionContext().workspaceState.update(`${group}BuildConfigurationName`, this.configurationName());
        }
        const productName = this.productName();
        if (productName) {
            await this._project.session().extensionContext().workspaceState.update(`${group}BuildProductName`, this.productName());
        }
    }

    async setup(profile?: QbsProfileData, configuration?: QbsConfigData, product?: QbsProductData) {
        let changed = false;
        let autoResolveRequred = false;
        if (this.setupProfile(profile)) {
            changed = true;
            autoResolveRequred = true;
        };
        if (this.setupConfiguration(configuration)) {
            changed = true;
            autoResolveRequred = true;
        }
        if (this.setupProduct(product)) {
            changed = true;
        }
        if (changed) {
            this._onChanged.fire(autoResolveRequred);
            await this.save();
        }
    }

    private async extractProfile(group: string) {
        const profiles = await this._project.session().settings().enumerateProfiles();
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}BuildProfileName`);
        const index = profiles.findIndex((profile) => profile.name() == name);
        return (index !== -1) ? profiles[index] : (profiles.length > 0 ? profiles[0] : undefined);
    }

    private async extractConfiguration(group: string) {
        const configurations = await this._project.session().settings().enumerateConfigurations();
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}BuildConfigurationName`);
        const index = configurations.findIndex((configuration) => configuration.name() == name);
        return (index !== -1) ? configurations[index] : (name ? new QbsConfigData(name) : undefined);
    }

    private async extractProduct(group: string) {
        const products = this._project.products();
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}BuildProductName`);
        const index = products.findIndex((product) => product.fullDisplayName() == name);
        return (index !== -1) ? products[index] : new QbsProductData(name ? name : 'all');
    }

    private setupProfile(profile?: QbsProfileData): boolean {
        if (profile && profile.name() !== this._profile.name()) {
            this._profile = profile;
            return true;
        }
        return false;
    }

    private setupConfiguration(configuration?: QbsConfigData) {
        if (configuration && configuration.name() != this._config.name()) {
            this._config = configuration;
            return true;
        }
        return false;
    }

    private setupProduct(product?: QbsProductData) {
        if (product && product.fullDisplayName() !== this._product.fullDisplayName()) {
            this._product = product;
            return true;
        }
        return false;
    }
}

export class QbsRunStep implements vscode.Disposable {
    private _product?: QbsProductData;
    private _dbg?: QbsDebuggerData;
    private _onChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    readonly onChanged: vscode.Event<boolean> = this._onChanged.event;

    constructor(private readonly _project: QbsProject) {}

    dispose() {}

    project(): QbsProject { return this._project; }
    productName(): string { return this._product?.fullDisplayName() || ''; }
    targetExecutable(): string { return this._product?.targetExecutable() || ''; }
    debugger(): QbsDebuggerData | undefined { return this._dbg; }
    debuggerName(): string | undefined { return this._dbg?.name(); }

    async restore() {
        const group = `${this._project.name()}::`;
        const product = await this.extractProduct(group);
        const dbg = await this.extractDebugger(group);
        await this.setup(product, dbg);
    }

    async save() {
        const group = `${this._project.name()}::`;
        await this._project.session().extensionContext().workspaceState.update(`${group}RunProductName`, this.productName());
        await this._project.session().extensionContext().workspaceState.update(`${group}DebuggerName`, this.debuggerName());
    }

    async setup(product?: QbsProductData, dbg?: QbsDebuggerData) {
        let changed = false;
        let autoResolveRequred = false;
        if (this.setupProduct(product)) {
            changed = true;
        }
        if (this.setupDebugger(dbg)) {
            changed = true;
        }
        if (changed) {
            this._onChanged.fire(autoResolveRequred);
            await this.save();
        }
    }

    private async extractProduct(group: string) {
        const products = (this._project.session().project()?.products() || [])
            .filter(product => product.isRunnable());
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}RunProductName`);
        const index = products.findIndex((product) => product.fullDisplayName() == name);
        return (index !== -1) ? products[index] : (products.length > 0 ? products[0] : undefined);
    }

    private async extractDebugger(group: string): Promise<QbsDebuggerData> {
        const dbgs = (await this._project.session().settings().enumerateDebuggers()) || [];
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}DebuggerName`);
        const index = dbgs.findIndex((dbg) => dbg.name() == name);
        return dbgs[(index !== -1) ? index : 0];
    }

    private setupProduct(product?: QbsProductData): boolean {
        if (product) {
            this._product = product;
            this.updateDebuggerConfiguration(true);
            return true;
        }
        return false;
    }

    private setupDebugger(dbg?: QbsDebuggerData): boolean {
        if (dbg) {
            this._dbg = dbg;
            this.updateDebuggerConfiguration(false);
            return true;
        }
        return false;
    }

    private updateDebuggerConfiguration(envRequired: boolean) {
        const program = this._product?.targetExecutable() || '';
        const cwd = path.dirname(program);
        this._dbg?.setProgram(program);
        this._dbg?.setCwd(cwd);

        // Request env variables.
        if (envRequired) {
            new Promise<void>(resolve => {
                const envReceicedSubscription = this.project().session().onRunEnvironmentReceived(async (env) => {
                    this._dbg?.setEnvironmentData(env);
                    await envReceicedSubscription.dispose();
                    resolve();
                });
                const envRequest = new QbsGetRunEnvironmentRequest(this.project().session().settings());
                envRequest.setProduct(this.productName() || '');
                this.project().session().getRunEnvironment(envRequest);
            });
        }

        if (this._dbg?.isAutomatic()) {
            const properties = this._product?.moduleProperties();
            if (!properties?.isValid()) {
                return;
            }
            const toolchain = properties?.toolchain() || [];
            if (toolchain.indexOf('msvc') !== -1) {
                this._dbg.setType('cppvsdbg');
                return;
            } else if (toolchain.indexOf('gcc') !== -1) {
                this._dbg.setType('cppdbg');
                const compilerDirectory = path.dirname(properties?.compilerPath() || '');

                const detectDebuggerPath = (toolchainPath: string, debuggerName: string) => {
                    const ext = (process.platform === 'win32') ? '.exe' : '';
                    let debuggerPath = path.join(toolchainPath, debuggerName + ext);
                    if (!fs.existsSync(debuggerPath)) {
                        try {
                            debuggerPath = which.sync(debuggerName + ext);
                        } catch (e) {
                            return '';
                        }
                    }
                    return debuggerPath;
                };

                const cpptoolsExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
                const cpptoolsDebuggerPath = cpptoolsExtension ? path.join(cpptoolsExtension.extensionPath, "debugAdapters", "lldb-mi", "bin") : undefined;
                // Check for LLDB-MI debugger executable.
                let miDebuggerPath = detectDebuggerPath(compilerDirectory, 'lldb-mi');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('lldb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
                if (cpptoolsDebuggerPath) {
                    // Check for LLDB-MI installed by CppTools
                    miDebuggerPath = detectDebuggerPath(cpptoolsDebuggerPath, 'lldb-mi');
                    if (miDebuggerPath) {
                        this._dbg.setMiMode('lldb');
                        this._dbg.setMiDebuggerPath(miDebuggerPath);
                        return;
                    }
                }
                // Check for GDB debugger executable.
                miDebuggerPath = detectDebuggerPath(compilerDirectory, 'gdb');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('gdb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
                // Check for LLDB debugger executable.
                miDebuggerPath = detectDebuggerPath(compilerDirectory, 'lldb');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('lldb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
            }

            // TODO: Show error?
        }
    }
}
