import * as vscode from 'vscode';

import {QbsProject} from '../qbsproject';

import {QbsConfigData} from '../datatypes/qbsconfigdata';
import {QbsProductData} from '../datatypes/qbsproductdata';
import {QbsProfileData} from '../datatypes/qbsprofiledata';

export class QbsBuildStep implements vscode.Disposable {
    private _profile: QbsProfileData = new QbsProfileData();
    private _config: QbsConfigData = new QbsConfigData('none');
    private _product: QbsProductData = new QbsProductData('');
    private _onChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    readonly onChanged: vscode.Event<boolean> = this._onChanged.event;

    constructor (private readonly _project: QbsProject) {}

    dispose() {}

    project(): QbsProject { return this._project; }
    profileName(): string { return this._profile.name(); }
    configurationName(): string { return this._config.name; }
    configurationOverriddenProperties(): any { return this._config.properties; }
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
        const index = configurations.findIndex((configuration) => configuration.name == name);
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
        if (!configuration)
            return false;
        if (this._config.name == configuration.name) {
            const oldprops = JSON.stringify(this._config.properties);
            const newprops = JSON.stringify(configuration.properties);
            if (oldprops == newprops)
                return false;
        }
        this._config = configuration;
        return true;
    }

    private setupProduct(product?: QbsProductData) {
        if (product && product.fullDisplayName() !== this._product.fullDisplayName()) {
            this._product = product;
            return true;
        }
        return false;
    }
}
