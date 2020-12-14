import {QbsDataKey} from './qbskeys';

export class QbsTaskMaxProgressResponse {
    readonly _maxProgress: number;

    constructor(response: any) {
        this._maxProgress = parseInt(response[QbsDataKey.MaxProgress]);
    }
}
