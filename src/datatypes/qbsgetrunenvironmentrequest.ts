import {QbsRequestType} from './qbsrequesttype';
import {QbsRequest} from './qbsrequest';
import {QbsSettings} from '../qbssettings';

export class QbsGetRunEnvironmentRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();

        this.setType(QbsRequestType.GetRunEnvironment);
    }
}
