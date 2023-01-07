import { QbsProtocolDataMode } from './qbsprotocoldatamode';
import { QbsProtocolErrorHandlingMode } from './qbsprotocolerrorhandlingmode';
import { QbsProtocolLogLevel } from './qbsprotocolloglevel';
import { QbsProtocolModuleProperties } from './qbsprotocolmoduleproperties';
import { QbsProtocolRequest } from './qbsprotocolrequest';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the resolve request data for Qbs protocol. */
export class QbsProtocolResolveRequest extends QbsProtocolRequest {
    public constructor(
        buildRoot: string,
        dryRun: boolean,
        errorHandlingMode: QbsProtocolErrorHandlingMode,
        forceProbeExecution: boolean,
        logLevel: QbsProtocolLogLevel) {
        super();
        this.setBuildRoot(buildRoot);
        this.setDataMode(QbsProtocolDataMode.OnlyChanged);
        this.setDryRun(dryRun);
        this.setEnvironment(process.env);
        this.setErrorHandlingMode(errorHandlingMode);
        this.setForceProbeExecution(forceProbeExecution);
        this.setLogLevel(logLevel);
        this.setModuleProperties(QbsProtocolModuleProperties.Exported);
        this.setOverrideBuildGraphData(true);
        this.setType(QbsProtocolRequestType.Resolve);
    }
}
