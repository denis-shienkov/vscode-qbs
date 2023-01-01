import { QbsProtocolCommandEchoMode } from './qbsprotocolcommandechomode';
import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolDataMode } from './qbsprotocoldatamode';
import { QbsProtocolErrorHandlingMode } from './qbsprotocolerrorhandlingmode';
import { QbsProtocolLogLevel } from './qbsprotocolloglevel';
import { QbsProtocolRequestType } from './qbsprotocolrequesttype';

/** Helper data type for wrapping the common request data for Qbs QbsProtocolDataKey. */
export abstract class QbsProtocolRequest {
    protected data: any = {};

    public getData(): any { return this.data; }

    public setType(type: QbsProtocolRequestType) { // Mandatory.
        this.data[QbsProtocolDataKey.Type] = type;
    }

    public setBuildRoot(buildRoot: string) { // Mandatory.
        this.data[QbsProtocolDataKey.BuildRoot] = buildRoot;
    }

    public setCleanInstallRoot(cleanInstallRoot?: boolean) {
        if (cleanInstallRoot)
            this.data[QbsProtocolDataKey.CleanInstallRoot] = cleanInstallRoot;
    }

    public setCommandEchoMode(commandEchoMode?: QbsProtocolCommandEchoMode) {
        if (commandEchoMode)
            this.data[QbsProtocolDataKey.CommandEchoMode] = commandEchoMode;
    }

    public setConfigurationName(configurationName?: string) {
        if (configurationName)
            this.data[QbsProtocolDataKey.ConfigurationName] = configurationName;
    }

    public setDataMode(dataMode?: QbsProtocolDataMode) {
        if (dataMode)
            this.data[QbsProtocolDataKey.DataMode] = dataMode;
    }

    public setDryRun(dryRun?: boolean) {
        if (dryRun)
            this.data[QbsProtocolDataKey.DryRun] = dryRun;
    }

    public setEnvironment(environment?: any) {
        if (environment)
            this.data[QbsProtocolDataKey.Environment] = environment;
    }

    public setErrorHandlingMode(errorHandlingMode?: QbsProtocolErrorHandlingMode) {
        if (errorHandlingMode)
            this.data[QbsProtocolDataKey.ErrorHandlingMode] = errorHandlingMode;
    }

    public setForceProbeExecution(forceProbeExecution?: boolean) {
        if (forceProbeExecution)
            this.data[QbsProtocolDataKey.ForceProbeExecution] = forceProbeExecution;
    }

    public setInstall(install?: boolean) {
        if (install)
            this.data[QbsProtocolDataKey.Install] = install;
    }

    public setKeepGoing(keepGoing?: boolean) {
        if (keepGoing)
            this.data[QbsProtocolDataKey.KeepGoing] = keepGoing;
    }

    public setLogLevel(logLevel?: QbsProtocolLogLevel) {
        if (logLevel)
            this.data[QbsProtocolDataKey.LogLevel] = logLevel;
    }

    public setMaxJobCount(maxJobCount?: number) {
        if (maxJobCount)
            this.data[QbsProtocolDataKey.MaxJobCount] = maxJobCount;
    }

    public setModuleProperties(moduleProperties?: string[]) {
        if (moduleProperties)
            this.data[QbsProtocolDataKey.ModuleProperties] = moduleProperties;
    }

    public setOverrideBuildGraphData(override: boolean) {
        if (override)
            this.data[QbsProtocolDataKey.OverrideBuildGraphData] = override;
    }

    public setOverriddenProperties(overriddenProperties?: any) {
        if (overriddenProperties)
            this.data[QbsProtocolDataKey.OverriddenProperties] = overriddenProperties;
    }

    public setProduct(product?: string) {
        if (product)
            this.data[QbsProtocolDataKey.Product] = product;
    }

    public setProducts(products?: string[]) {
        if (products && products.length)
            this.data[QbsProtocolDataKey.Products] = products;
    }

    public setProjectFilePath(projectFilePath?: string) {
        if (projectFilePath)
            this.data[QbsProtocolDataKey.ProjectFilePath] = projectFilePath;
    }

    public setSettingsDirectory(settingsDirectory?: string) {
        if (settingsDirectory)
            this.data[QbsProtocolDataKey.SettingsDirectory] = settingsDirectory;
    }

    public setTopLevelProfile(topLevelProfile?: string) {
        if (topLevelProfile)
            this.data[QbsProtocolDataKey.TopLevelProfile] = topLevelProfile;
    }
}
