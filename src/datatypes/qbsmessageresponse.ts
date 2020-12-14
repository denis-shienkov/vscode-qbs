import {QbsDataKey} from './qbskeys';

export class QbsMessageItemResponse {
    readonly _description: string = '';
    readonly _filePath: string = '';
    readonly _line: number = -1;

    constructor(msg: any) {
        if (typeof msg === 'string') {
            this._description = msg;
        } else {
            this._description = msg[QbsDataKey.Description];
            const location = msg[QbsDataKey.Location] || {};
            this._filePath = location[QbsDataKey.FilePath] || '';
            this._line = parseInt(location[QbsDataKey.Line] || -1);
        }
    }

    toString(): string {
        let s: string = this._filePath || '';
        if (s && !isNaN(this._line) && (this._line != -1))
            s += ':' + this._line;
        if (s)
            s += ':';
        s += this._description;
        return s;
    }
}

export class QbsMessageResponse {
    readonly _messages: QbsMessageItemResponse[] = [];

    constructor(obj: any) {
        if (typeof obj === 'string') {
            this._messages.push(new QbsMessageItemResponse(obj));
        } else if (obj) {
            const items: any[] = obj[QbsDataKey.Items] || [];
            items.forEach(item => this._messages.push(new QbsMessageItemResponse(item)));
        }
    }

    isEmpty(): boolean {
        return this._messages.length === 0;
    }

    toString(): string {
        const strings: string[] = [];
        this._messages.forEach(message => strings.push(message.toString()));
        return strings.join('\n');
    }
}
