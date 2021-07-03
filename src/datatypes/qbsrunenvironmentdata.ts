export class QbsRunEnvironmentData {
    constructor(private readonly _data: {[key: string]: string}) {}

    data(): {[key: string]: string} {
        return this._data;
    }
}
