import * as vscode from 'vscode';

import {QbsProfile} from './qbsprofile';
import {QbsProduct} from './qbsproduct';
import {QbsBuildConfiguration} from './qbsbuildconfiguration';

export class QbsBuildStep implements vscode.Disposable {
    private _profile: QbsProfile = new QbsProfile();
    private _configuration: QbsBuildConfiguration = new QbsBuildConfiguration('debug');
    private _product: QbsProduct = new QbsProduct('all');
    private _onChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    readonly onChanged: vscode.Event<void> = this._onChanged.event;

    dispose() {
    }

    setProfile(profile?: QbsProfile) {
        if (profile && profile.name() !== this._profile.name()) {
            this._profile = profile;
            this._onChanged.fire();
        }
    }

    setConfiguration(configuration?: QbsBuildConfiguration) {
        if (configuration && configuration.name() != this._configuration.name()) {
            this._configuration = configuration;
            this._onChanged.fire();
        }
    }

    setProduct(product?: QbsProduct) {
        if (product && product.fullDisplayName() !== this._product.fullDisplayName()) {
            this._product = product;
            this._onChanged.fire();
        }
    }

    profileName(): string {
        return this._profile.name();
    }

    configurationName(): string {
        return this._configuration.name();
    }

    productName(): string {
        return this._product.fullDisplayName();
    }
}
