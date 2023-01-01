import { QbsProtocolLogLevel } from './qbsprotocolloglevel';
import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the install request data for Qbs protocol. */
export class QbsProtocolInstallRequest extends QbsProtocolRequest {
    public constructor(keepGoing: boolean, logLevel: QbsProtocolLogLevel) {
        super();
        this.setKeepGoing(keepGoing);
        this.setLogLevel(logLevel);
        this.setType(QbsProtocolRequestType.Install);
    }
}
