import {QbsLogLevel} from './qbsloglevel';
import {QbsRequestType} from './qbsrequesttype';
import {QbsRequest} from './qbsrequest';
import {QbsSettings} from '../qbssettings';

export class QbsInstallRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();

        const keepGoing = this.keepGoingFromSettings(settings);
        const logLevel = this.logLevelFromSettings(settings);

        this.setKeepGoing(keepGoing);
        this.setLogLevel(logLevel);
        this.setType(QbsRequestType.Install);
    }

    private keepGoingFromSettings(settings?: QbsSettings): boolean {
        return  settings ? settings.keepGoing() : false;
    }

    private logLevelFromSettings(settings?: QbsSettings): QbsLogLevel {
        return settings ? settings.logLevel() : QbsLogLevel.Info;
    }
}
