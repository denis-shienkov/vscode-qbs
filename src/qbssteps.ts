import * as vscode from 'vscode';
import {QbsProject} from './qbsproject';

export class QbsProfile {
    constructor(private readonly _name: string = '') {}
    name(): string { return this._name; }
}

export class QbsConfig {
    constructor(private readonly _name: string, private readonly _displayName?: string, private readonly _description?: string) {}
    name(): string { return this._name; }
    displayName(): string | undefined { return this._displayName; }
    description(): string | undefined { return this._description; }
}

export class QbsProduct {
    constructor(private readonly _data: any) {}

    fullDisplayName(): string { return (typeof this._data === 'string')
        ? this._data.toString() : this._data['full-display-name']; }

    targetExecutable(): string { return this._data['target-executable']; }
    isRunnable(): boolean { return this._data['is-runnable']; }
    isEnabled(): boolean { return this._data['is-enabled']; }
    isEmpty(): boolean { return typeof this._data === 'string'; }
}

export class QbsDebugger {
    constructor(private readonly _data: any) {}
    name(): string { return this._data['name']; }
    data(): vscode.DebugConfiguration { return this._data; }
}

export class QbsRunEnvironment {
    constructor(private readonly _data: any) {}
    data(): any { return this._data; }
}

export class QbsBuildStep implements vscode.Disposable {
    private _profile: QbsProfile = new QbsProfile();
    private _config: QbsConfig = new QbsConfig('debug');
    private _product: QbsProduct = new QbsProduct('');
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

    async setup(profile?: QbsProfile, configuration?: QbsConfig, product?: QbsProduct) {
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
        return (index !== -1) ? configurations[index] : (name ? new QbsConfig(name) : undefined);
    }

    private async extractProduct(group: string) {
        const products = await this._project.enumerateProducts();
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}BuildProductName`);
        const index = products.findIndex((product) => product.fullDisplayName() == name);
        return (index !== -1) ? products[index] : (name === 'all' ? new QbsProduct(name) : undefined);
    }

    private setupProfile(profile?: QbsProfile): boolean {
        if (profile && profile.name() !== this._profile.name()) {
            this._profile = profile;
            return true;
        }
        return false;
    }

    private setupConfiguration(configuration?: QbsConfig) {
        if (configuration && configuration.name() != this._config.name()) {
            this._config = configuration;
            return true;
        }
        return false;
    }

    private setupProduct(product?: QbsProduct) {
        if (product && product.fullDisplayName() !== this._product.fullDisplayName()) {
            this._product = product;
            return true;
        }
        return false;
    }
}

export class QbsRunStep implements vscode.Disposable {
    private _product?: QbsProduct;
    private _gdb?: QbsDebugger;
    private _env?: QbsRunEnvironment;
    private _onChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    readonly onChanged: vscode.Event<boolean> = this._onChanged.event;

    constructor(private readonly _project: QbsProject) {}

    dispose() {}

    project(): QbsProject { return this._project; }
    productName(): string { return this._product?.fullDisplayName() || ''; }
    targetExecutable(): string { return this._product?.targetExecutable() || ''; }
    debugger(): QbsDebugger | undefined { return this._gdb; }
    runEnvironment(): QbsRunEnvironment | undefined { return this._env; }
    debuggerName(): string | undefined { return this._gdb?.name(); }

    async restore() {
        const group = `${this._project.name()}::`;
        const product = await this.extractProduct(group);
        await this.setup(product, undefined, undefined);
    }

    async save() {
        const group = `${this._project.name()}::`;
        await this._project.session().extensionContext().workspaceState.update(`${group}RunProductName`, this.productName());
    }

    async setup(product?: QbsProduct, dbg?: QbsDebugger, env?: QbsRunEnvironment ) {
        let changed = false;
        let autoResolveRequred = false;
        if (this.setupProduct(product)) {
            changed = true;
        }
        if (this.setupDebugger(dbg)) {
            changed = true;
        }
        if (this.setupRunEnvironment(env)) {
            changed = true;
        }
        if (changed) {
            this._onChanged.fire(autoResolveRequred);
            await this.save();
        }
    }

    private async extractProduct(group: string) {
        const products = (await this._project.session().project()?.enumerateProducts() || [])
            .filter(product => product.isRunnable());
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}RunProductName`);
        const index = products.findIndex((product) => product.fullDisplayName() == name);
        return (index !== -1) ? products[index] : (products.length > 0 ? products[0] : undefined);
    }

    private setupProduct(product?: QbsProduct): boolean {
        if (product) {
            this._product = product;
            return true;
        }
        return false;
    }

    private setupDebugger(gdb?: QbsDebugger): boolean {
        if (gdb && gdb.name() !== this._gdb?.name()) {
            this._gdb = gdb;
            return true;
        }
        return false;
    }

    private setupRunEnvironment(env?: QbsRunEnvironment): boolean {
        if (env) {
            this._env = env;
            return true;
        }
        return false;
    }
}
