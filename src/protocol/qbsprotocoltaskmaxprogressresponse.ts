import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the max progress response data for Qbs protocol. */
export class QbsProtocolTaskMaxProgressResponse {
    readonly maxProgress: number;

    public constructor(response: any) {
        this.maxProgress = parseInt(response[QbsProtocolDataKey.MaxProgress]);
    }
}
