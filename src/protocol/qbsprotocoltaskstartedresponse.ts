import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the task progress response data for Qbs protocol. */
export class QbsProtocolTaskStartedResponse {
    readonly description: string;
    readonly maxProgress: number;

    public constructor(response: any) {
        this.description = response[QbsProtocolDataKey.Description];
        this.maxProgress = parseInt(response[QbsProtocolDataKey.MaxProgress]);
    }
}
