import * as fs from 'fs';

import {QbsDataMode} from './qbsdatamode';
import {QbsErrorHandlingMode} from './qbserrorhandlingmode';
import {QbsLogLevel} from './qbsloglevel';
import {QbsModuleProperties} from './qbsmoduleproperties';
import {QbsRequestType} from './qbsrequesttype';
import {QbsRequest} from './qbsrequest';
import {QbsSettings} from '../qbssettings';

export class QbsResolveRequest extends QbsRequest {

    constructor(settings?: QbsSettings) {
        super();

        const buildRoot = this.buildRootFromSettings(settings);
        const dryRun = !fs.existsSync(buildRoot);
        const errorHandlingMode = this.errorHandlingModeFromSettings(settings);
        const forceProbeExecution = this.forceProbeExecutionFromSettings(settings);
        const logLevel = this.logLevelFromSettings(settings);
        const settingsDirectory = this.settingsDirectoryFromSettings(settings);

        this.setBuildRoot(buildRoot);
        this.setDataMode(QbsDataMode.OnlyChanged);
        this.setDryRun(dryRun);
        this.setEnvironment(process.env);
        this.setErrorHandlingMode(errorHandlingMode);
        this.setForceProbeExecution(forceProbeExecution);
        this.setLogLevel(logLevel);
        this.setModuleProperties(QbsModuleProperties.Exported);
        this.setSettingsDirectory(settingsDirectory);
        this.setType(QbsRequestType.Resolve);
    }

    private buildRootFromSettings(settings?: QbsSettings): string {
        return settings ? settings.buildDirectory() : '';
    }

    private errorHandlingModeFromSettings(settings?: QbsSettings): QbsErrorHandlingMode {
        return settings ? settings.errorHandlingMode() : QbsErrorHandlingMode.Relaxed;
    }

    private forceProbeExecutionFromSettings(settings?: QbsSettings): boolean {
        return settings ? settings.forceProbes() : false;
    }

    private logLevelFromSettings(settings?: QbsSettings): QbsLogLevel {
        return settings ? settings.logLevel() : QbsLogLevel.Info;
    }

    private settingsDirectoryFromSettings(settings?: QbsSettings): string {
        return settings ? settings.settingsDirectory() : '';
    }
}
