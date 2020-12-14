import {QbsDataKey} from './qbskeys';
import {QbsQbsData} from './qbsqbsdata';

export class QbsProfileData {
    private _name?: string;
    private _data?: any;

    constructor(data: any = {}) {
        for (var i in data) {
            this._name = i;
            this._data = data[i];
            return;
        }
    }

    name(): string {
        return this._name || '';
    }

    data(): any {
        return this._data;
    }

    qbs(): QbsQbsData {
        return new QbsQbsData(this._data[QbsDataKey.Qbs]);
    }

    isValid() {
        return this._name && this._data;
    }
}
