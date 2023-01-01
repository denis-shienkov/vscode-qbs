import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the hello response data for Qbs protocol. */
export class QbsProtocolHelloResponse {
    public readonly apiLevel: number = 0;
    public readonly apiCompatibilityLevel: number = 0;

    public constructor(response: any) {
        this.apiLevel = parseInt(response[QbsProtocolDataKey.ApiLevel]);
        this.apiCompatibilityLevel = parseInt(response[QbsProtocolDataKey.ApiCompatLevel]);
    }
}
