import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the task progress response data for Qbs protocol. */
export class QbsProtocolTaskProgressResponse {
    readonly progress: number;

    public constructor(response: any) {
        this.progress = parseInt(response[QbsProtocolDataKey.Progress]);
    }
}
