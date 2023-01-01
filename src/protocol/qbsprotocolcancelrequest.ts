import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the cancel request data for Qbs protocol. */
export class QbsProtocolCancelRequest extends QbsProtocolRequest {
    public constructor() {
        super();
        this.setType(QbsProtocolRequestType.Cancel);
    }
}
