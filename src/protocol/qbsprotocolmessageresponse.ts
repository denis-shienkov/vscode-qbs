import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the item of the message response data for Qbs protocol. */
export class QbsProtocolMessageItemResponse {
    public readonly description?: string;
    public readonly fsPath?: string;
    public readonly lineNo: number = -1;
    public readonly columnNo: number = -1;

    public constructor(msg: any) {
        if (typeof msg === 'string') {
            this.description = msg;
        } else {
            this.description = msg[QbsProtocolDataKey.Description];
            const location = msg[QbsProtocolDataKey.Location];
            this.fsPath = location[QbsProtocolDataKey.FilePath];
            this.lineNo = parseInt(location[QbsProtocolDataKey.Line]);
            this.columnNo = parseInt(location[QbsProtocolDataKey.Column]);
        }
    }

    public toString(): string {
        let s: string = this.fsPath || '';
        if (s && !isNaN(this.lineNo) && (this.lineNo != -1))
            s += ':' + this.lineNo;
        if (s)
            s += ':';
        s += this.description;
        return s;
    }
}

/** Helper data type for wrapping the message response data for Qbs protocol. */
export class QbsProtocolMessageResponse {
    public readonly messages: QbsProtocolMessageItemResponse[] = [];

    public constructor(obj: any) {
        if (typeof obj === 'string') {
            this.messages = [new QbsProtocolMessageItemResponse(obj)];
        } else if (obj) {
            this.messages = (obj[QbsProtocolDataKey.Items] || [])
                .map((data: any) => new QbsProtocolMessageItemResponse(data));
        }
    }

    public getIsEmpty(): boolean { return !this.messages.length; }
    public toString(): string { return this.messages.map(msg => msg.toString()).join('\n'); }
}
