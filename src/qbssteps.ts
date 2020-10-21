import * as vscode from 'vscode';

export class QbsProfile {
    constructor(readonly _name: string = '') {}
    name(): string { return this._name; }
}

export class QbsConfig {
    constructor(readonly _name: string) {}
    name(): string { return this._name; }
}

export class QbsProduct {
    constructor(readonly _data: any) {}

    fullDisplayName(): string { return (typeof this._data === 'string')
        ? this._data.toString() : this._data['full-display-name']; }

    targetExecutable(): string { return this._data['target-executable']; }
    isRunnable(): boolean { return this._data['is-runnable']; }
    isEnabled(): boolean { return this._data['is-enabled']; }
    isEmpty(): boolean { return typeof this._data === 'string'; }
}

export class QbsDebugger {
    constructor(readonly _data: any) {}
    name(): string { return this._data['name']; }
    data(): vscode.DebugConfiguration { return this._data; }
}

export class QbsRunEnvironment {
    constructor(readonly _data: any) {}
    data(): any { return this._data; }
}

export class QbsBuildStep implements vscode.Disposable {
    private _profile: QbsProfile = new QbsProfile();
    private _config: QbsConfig = new QbsConfig('debug');
    private _product: QbsProduct = new QbsProduct('all');
    private _onChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    readonly onChanged: vscode.Event<void> = this._onChanged.event;

    dispose() {}

    setProfile(profile?: QbsProfile) {
        if (profile && profile.name() !== this._profile.name()) {
            this._profile = profile;
            this._onChanged.fire();
        }
    }

    setConfiguration(configuration?: QbsConfig) {
        if (configuration && configuration.name() != this._config.name()) {
            this._config = configuration;
            this._onChanged.fire();
        }
    }

    setProduct(product?: QbsProduct) {
        if (product && product.fullDisplayName() !== this._product.fullDisplayName()) {
            this._product = product;
            this._onChanged.fire();
        }
    }

    profileName(): string { return this._profile.name(); }
    configurationName(): string { return this._config.name(); }
    productName(): string { return this._product.fullDisplayName(); }
}

export class QbsRunStep implements vscode.Disposable {
    private _product?: QbsProduct;
    private _gdb?: QbsDebugger;
    private _env?: QbsRunEnvironment;
    private _onChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    readonly onChanged: vscode.Event<void> = this._onChanged.event;

    dispose() {}

    cleanup() {
        this._product = undefined;
        this._onChanged.fire();
    }

    setProduct(product?: QbsProduct) {
        this._product = product;
        this._onChanged.fire();
    }

    setDebugger(gdb?: QbsDebugger) {
        if (gdb && gdb.name() !== this._gdb?.name()) {
            this._gdb = gdb;
            this._onChanged.fire();
        }
    }

    setRunEnvironment(env?: QbsRunEnvironment) {
        this._env = env;
        this._onChanged.fire();
    }

    productName(): string { return this._product?.fullDisplayName() || ''; }
    targetExecutable(): string { return this._product?.targetExecutable() || ''; }
    debugger(): QbsDebugger | undefined { return this._gdb; }
    runEnvironment(): QbsRunEnvironment | undefined { return this._env; }
    debuggerName(): string | undefined { return this._gdb?.name(); }
}
