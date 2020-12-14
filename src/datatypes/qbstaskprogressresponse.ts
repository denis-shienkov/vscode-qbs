import {QbsDataKey} from './qbskeys';

export class QbsTaskProgressResponse {
    readonly _progress: number;

    constructor(response: any) {
        this._progress = parseInt(response[QbsDataKey.Progress]);
    }
}
