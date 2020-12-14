import {QbsDataKey} from './qbskeys';

export class QbsHelloResponse {
    readonly _apiLevel: number = 0;
    readonly _apiCompatibilityLevel: number = 0;

    constructor(response: any) {
        this._apiLevel = parseInt(response[QbsDataKey.ApiLevel]);
        this._apiCompatibilityLevel = parseInt(response[QbsDataKey.ApiCompatLevel]);
    }
}
