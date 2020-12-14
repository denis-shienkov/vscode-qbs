import {basename} from 'path';

import {QbsDataKey} from './qbskeys';

export class QbsLocationData {
    constructor(private readonly _data: any) {}

    filePath(): string {
        return this._data[QbsDataKey.FilePath];
    }

    fileName(): string {
        return basename(this.filePath());
    }

    line(): number {
        return this._data[QbsDataKey.Line];
    }

    column(): number {
         return this._data[QbsDataKey.Column];
    }

    id(): string {
        return `${this.filePath()}:${this.line()}:${this.column()}`;
    }
}
