import * as vscode from 'vscode';

import {QbsProduct} from './qbsproduct';
import {QbsDebugger} from './qbsdebugger';
import {QbsRunEnvironment} from './qbsrunenvironment';

export class QbsRunStep implements vscode.Disposable {
    private _product?: QbsProduct;
    private _gdb?: QbsDebugger;
    private _env?: QbsRunEnvironment;
    private _onChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    readonly onChanged: vscode.Event<void> = this._onChanged.event;

    dispose() {
    }

    cleanup() {
        this._product = undefined;
        this._onChanged.fire();
    }

    setProduct(product?: QbsProduct) {
        if (product && product.fullDisplayName() !== this._product?.fullDisplayName()) {
            this._product = product;
            this._onChanged.fire();
        }
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

    productName(): string {
        return this._product?.fullDisplayName() || '';
    }

    targetExecutable(): string {
        return this._product?.targetExecutable() || '';
    }

    debugger(): QbsDebugger | undefined {
        return this._gdb;
    }

    runEnvironment(): QbsRunEnvironment | undefined {
        return this._env;
    }
}
