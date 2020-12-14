import {QbsCommandEchoMode} from './qbscommandechomode';
import {QbsDataKey} from './qbskeys';
import {QbsDataMode} from './qbsdatamode';
import {QbsErrorHandlingMode} from './qbserrorhandlingmode';
import {QbsLogLevel} from './qbsloglevel';
import {QbsRequestType} from './qbsrequesttype';

export abstract class QbsRequest {
    protected _data: any = {};

    data(): any {
        return this._data;
    }

    setBuildRoot(buildRoot: string) {
        this._data[QbsDataKey.BuildRoot] = buildRoot;
    }

    setCleanInstallRoot(cleanInstallRoot: boolean) {
        this._data[QbsDataKey.CleanInstallRoot] = cleanInstallRoot;
    }

    setCommandEchoMode(commandEchoMode: QbsCommandEchoMode) {
        this._data[QbsDataKey.CommandEchoMode] = commandEchoMode;
    }

    setConfigurationName(configurationName: string) {
        this._data[QbsDataKey.ConfigurationName] = configurationName;
    }

    setDataMode(dataMode: QbsDataMode) {
        this._data[QbsDataKey.DataMode] = dataMode;
    }

    setDryRun(dryRun: boolean) {
        this._data[QbsDataKey.DryRun] = dryRun;
    }

    setEnvironment(environment: any) {
        this._data[QbsDataKey.Environment] = environment;
    }

    setErrorHandlingMode(errorHandlingMode: QbsErrorHandlingMode) {
        this._data[QbsDataKey.ErrorHandlingMode] = errorHandlingMode;
    }

    setForceProbeExecution(forceProbeExecution: boolean) {
        this._data[QbsDataKey.ForceProbeExecution] = forceProbeExecution;
    }

    setInstall(install: boolean) {
        this._data[QbsDataKey.Install] = install;
    }

    setKeepGoing(keepGoing: boolean) {
        this._data[QbsDataKey.KeepGoing] = keepGoing;
    }

    setLogLevel(logLevel: QbsLogLevel) {
        this._data[QbsDataKey.LogLevel] = logLevel;
    }

    setMaxJobCount(maxJobCount: number) {
        this._data[QbsDataKey.MaxJobCount] = maxJobCount;
    }

    setModuleProperties(moduleProperties: string[]) {
        this._data[QbsDataKey.ModuleProperties] = moduleProperties;
    }

    setProduct(product: string) {
        this._data[QbsDataKey.Product] = product;
    }

    setProducts(products: string[]) {
        this._data[QbsDataKey.Products] = products;
    }

    setProjectFilePath(projectFilePath: string) {
        this._data[QbsDataKey.ProjectFilePath] = projectFilePath;
    }

    setSettingsDirectory(settingsDirectory: string) {
        this._data[QbsDataKey.SettingsDirectory] = settingsDirectory;
    }

    setTopLevelProfile(topLevelProfile: string) {
        this._data[QbsDataKey.TopLevelProfile] = topLevelProfile;
    }

    setType(type: QbsRequestType) {
        this._data[QbsDataKey.Type] = type;
    }
}
