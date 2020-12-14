import {QbsDataKey} from './qbskeys';

export class QbsTaskStartedResponse {
    readonly _description: string;
    readonly _maxProgress: number;

    constructor(response: any) {
        this._description = response[QbsDataKey.Description];
        this._maxProgress = parseInt(response[QbsDataKey.MaxProgress]);
    }
}
