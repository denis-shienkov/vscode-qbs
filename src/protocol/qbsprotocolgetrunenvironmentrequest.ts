import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the get run environment request data for Qbs protocol. */
export class QbsProtocolGetRunEnvironmentRequest extends QbsProtocolRequest {
    public constructor() {
        super();
        this.setType(QbsProtocolRequestType.GetRunEnvironment);
    }
}
