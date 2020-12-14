import {QbsCommandEchoMode} from './qbscommandechomode';
import {QbsDataMode} from './qbsdatamode';
import {QbsLogLevel} from './qbsloglevel';
import {QbsModuleProperties} from './qbsmoduleproperties';
import {QbsRequestType} from './qbsrequesttype';
import {QbsRequest} from './qbsrequest';
import {QbsSettings} from '../qbssettings';

export class QbsBuildRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();

        const cleanInstallRoot = this.cleanInstallRootFromSettings(settings);
        const commandEchoMode = this.commandEchoModeFromSettings(settings);
        const keepGoing = this.keepGoingFromSettings(settings);
        const logLevel = this.logLevelFromSettings(settings);
        const maxJobCount = this.maxJobCountFromSettings(settings);

        this.setCleanInstallRoot(cleanInstallRoot);
        this.setCommandEchoMode(commandEchoMode);
        this.setDataMode(QbsDataMode.OnlyChanged);
        this.setInstall(true);
        this.setKeepGoing(keepGoing);
        this.setLogLevel(logLevel);
        this.setMaxJobCount(maxJobCount);
        this.setModuleProperties(QbsModuleProperties.Exported);
        this.setProducts([]);
        this.setType(QbsRequestType.Build);
    }

    private cleanInstallRootFromSettings(settings?: QbsSettings): boolean {
        return settings ? settings.cleanInstallRoot() : false;
    }

    private commandEchoModeFromSettings(settings?: QbsSettings): QbsCommandEchoMode {
        return (settings && settings.showCommandLines()) ? QbsCommandEchoMode.CommandLine : QbsCommandEchoMode.Summary;
    }

    private keepGoingFromSettings(settings?: QbsSettings): boolean {
        return  settings ? settings.keepGoing() : false;
    }

    private logLevelFromSettings(settings?: QbsSettings): QbsLogLevel {
        return settings ? settings.logLevel() : QbsLogLevel.Info;
    }

    private maxJobCountFromSettings(settings?: QbsSettings): number {
        return settings ? settings.maxJobs() : 0;
    }
}
