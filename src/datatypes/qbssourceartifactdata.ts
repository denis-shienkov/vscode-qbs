import {basename} from 'path';

import {QbsDataKey} from './qbskeys';

export class QbsSourceArtifactData {
    constructor(private readonly _data: any) {}

    filePath(): string {
        return this._data[QbsDataKey.FilePath];
    }

    fileName(): string {
        return basename(this.filePath());
    }

    fileTags(): string[] {
        return this._data[QbsDataKey.FileTags];
    }

    id(): string {
        return this.filePath();
    }
}
