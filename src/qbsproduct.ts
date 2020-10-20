export class QbsProduct {
    constructor(readonly _data: any) {
    }

    fullDisplayName(): string {
        if (typeof this._data === 'string') {
            return this._data.toString();
        }
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
        return typeof this._data === 'string';
    }
}
