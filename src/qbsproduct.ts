
export class QbsProduct {
    private _data: any;

    constructor(data: any) {
        this._data = data;
    }

    fullDisplayName(): string {
        return this._data['full-display-name'];
    }

    targetExecutable(): string {
        return this._data['target-executable'];
    }

    isRunnable(): boolean {
        return this._data['is-runnable'];
    }

    isEnabled(): boolean {
        return this._data['is-enabled'];
    }

    isEmpty(): boolean {
        return this._data['name'] === undefined;
    }

    static createEmptyProduct() {
        return new QbsProduct({});
    }
}
