import { QbsProtocolLogLevel } from './qbsprotocolloglevel';
import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the clean request data for Qbs protocol. */
export class QbsProtocolCleanRequest extends QbsProtocolRequest {
    public constructor(
        keepGoing: boolean,
        logLevel: QbsProtocolLogLevel) {
        super();
        this.setKeepGoing(keepGoing);
        this.setLogLevel(logLevel);
        this.setProducts([]);
        this.setType(QbsProtocolRequestType.Clean);
    }
}
