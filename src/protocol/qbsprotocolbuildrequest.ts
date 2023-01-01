import { QbsProtocolCommandEchoMode } from './qbsprotocolcommandechomode';
import { QbsProtocolDataMode } from './qbsprotocoldatamode';
import { QbsProtocolLogLevel } from './qbsprotocolloglevel';
import { QbsProtocolModuleProperties } from './qbsprotocolmoduleproperties';
import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the build request data for Qbs protocol. */
export class QbsProtocolBuildRequest extends QbsProtocolRequest {
    public constructor(
        cleanInstallRoot: boolean,
        commandEchoMode: QbsProtocolCommandEchoMode,
        keepGoing: boolean,
        logLevel: QbsProtocolLogLevel,
        maxJobCount: number) {
        super();
        this.setCleanInstallRoot(cleanInstallRoot);
        this.setCommandEchoMode(commandEchoMode);
        this.setDataMode(QbsProtocolDataMode.OnlyChanged);
        this.setInstall(true);
        this.setKeepGoing(keepGoing);
        this.setLogLevel(logLevel);
        this.setMaxJobCount(maxJobCount);
        this.setModuleProperties(QbsProtocolModuleProperties.Exported);
        this.setProducts([]);
        this.setType(QbsProtocolRequestType.Build);
    }
}
