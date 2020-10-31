import * as fs from 'fs';

import {QbsSettings} from './qbssettings';

// QBS session protocol resuests.

export abstract class QbsRequest {
    protected _data: any = {};
    data(): any { return this._data; }
}

export class QbsResolveRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'resolve-project';
        this._data['environment'] = process.env;
        this._data['data-mode'] = 'only-if-changed';
        this._data['module-properties'] = [
            'cpp.compilerVersionMajor',
            'cpp.compilerVersionMinor',
            'cpp.compilerVersionPatch',
            'cpp.compilerIncludePaths',
            'cpp.distributionIncludePaths',
            'cpp.systemIncludePaths',
            'cpp.includePaths',
            'cpp.frameworkPaths',
            'cpp.systemFrameworkPaths',
            'cpp.compilerDefinesByLanguage',
            'cpp.defines',
            'cpp.compilerName',
            'cpp.compilerPath',
            'cpp.compilerPathByLanguage',
            'cpp.cLanguageVersion',
            'cpp.cxxLanguageVersion',
            'cpp.prefixHeaders',
            'qbs.architecture',
            'qbs.toolchain'
        ];
        const buildDirectory = settings ? settings.buildDirectory() : '';
        this._data['build-root'] = buildDirectory;
        // Do not store the build graph if the build directory does not exist yet.
        this._data['dry-run'] = !fs.existsSync(buildDirectory);
        this._data['settings-directory'] = settings ? settings.settingsDirectory() : '';
        this._data['force-probe-execution'] = settings ? settings.forceProbes() : false;
        this._data['error-handling-mode'] = settings ? settings.errorHandlingMode() : 'relaxed';
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setProjectFilePath(projectFilePath: string) { this._data['project-file-path'] = projectFilePath; }
    setConfigurationName(configurationName: string) { this._data['configuration-name'] = configurationName; }
    setTopLevelProfile(topLevelProfile: string) { this._data['top-level-profile'] = topLevelProfile; }
    setBuildRoot(buildRoot: string) { this._data['build-root'] = buildRoot; }
    setDryRun(dryRun: boolean) { this._data['dry-run'] = dryRun; }
    setSettingsDirectory(settingsDirectory: string) { this._data['settings-directory'] = settingsDirectory; }
    setForceProbeExecution(forceProbeExecution: boolean) { this._data['force-probe-execution'] = forceProbeExecution; }
    setErrorHandlingMode(errorHandlingMode: string) { this._data['error-handling-mode'] = errorHandlingMode; }
    setLogLevel(logLavel: string) { this._data['log-level'] = logLavel; }
}

export class QbsBuildRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'build-project';
        this._data['data-mode'] = 'only-if-changed';
        this._data['install'] = true;
        this._data['max-job-count'] = settings ? settings.maxJobs() : 0;
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['command-echo-mode'] = settings ? (settings.showCommandLines() ? 'command-line' : 'summary') : 'summary';
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
        this._data['clean-install-root'] = settings ? settings.cleanInstallRoot() : false;
        this._data['products'] = [];
    }

    setMaxJobCount(maxJobCount: number) { this._data['max-job-count'] = maxJobCount; }
    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setCommandEchoMode(commandEchoMode: string) { this._data['command-echo-mode'] = commandEchoMode; }
    setLogLevel(logLavel: string) { this._data['log-level'] = logLavel; }
    setCleanInstallRoot(cleanInstallRoot: boolean) { this._data['clean-install-root'] = cleanInstallRoot; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsCleanRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'clean-project';
        this._data['products'] = [];
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setLogLevel(logLavel: string) { this._data['log-level'] = logLavel; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsInstallRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'install-project';
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setLogLevel(logLavel: string) { this._data['log-level'] = logLavel; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsCancelRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'cancel-job';
    }
}

export class QbsGetRunEnvironmentRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'get-run-environment';
    }

    setProductName(productName: string) { this._data['product'] = productName; }
}

// QBS session protocol responses.

export class QbsHelloResponse {
    readonly _apiLevel: number = 0;
    readonly _apiCompatibilityLevel: number = 0;

    constructor(response: any) {
        this._apiLevel = parseInt(response['api-level']);
        this._apiCompatibilityLevel = parseInt(response['api-compat-level']);
    }
}

export class QbsProcessResponse {
    readonly _executable: string;
    readonly _arguments: string[];
    readonly _workingDirectory: string;
    readonly _stdOutput: string[];
    readonly _stdError: string[];
    readonly _success: boolean;

    constructor(response: any) {
        this._executable = response['executable-file-path'];
        this._workingDirectory = response['working-directory'];
        this._arguments = response['arguments'];
        this._stdOutput = response['stdout'];
        this._stdError = response['stderr'];
        this._success = JSON.parse(response['success']);
    }
}

export class QbsTaskStartedResponse {
    readonly _description: string;
    readonly _maxProgress: number;

    constructor(response: any) {
        this._description = response['description'];
        this._maxProgress = parseInt(response['max-progress']);
    }
}

export class QbsTaskProgressResponse {
    readonly _progress: number;

    constructor(response: any) {
        this._progress = parseInt(response['progress']);
    }
}

export class QbsTaskMaxProgressResponse {
    readonly _maxProgress: number;

    constructor(response: any) {
        this._maxProgress = parseInt(response['max-progress']);
    }
}

export class QbsMessageItemResponse {
    readonly _description: string = '';
    readonly _filePath: string = '';
    readonly _line: number = -1;

    constructor(msg: string)
    constructor(msg: any) {
        if (typeof msg === 'string') {
            this._description = msg;
        } else {
            this._description = msg['description'];
            const location = msg['location'] || {};
            this._filePath = location['file-path'] || '';
            this._line = parseInt(location['line'] || '-1');
        }
    }

    toString(): string {
        let s: string = this._filePath || '';
        if (s && !isNaN(this._line) && (this._line != -1))
            s += ':' + this._line;
        if (s)
            s += ':';
        s += this._description;
        return s;
    }
}

export class QbsMessageResponse {
    readonly _messages: QbsMessageItemResponse[] = [];

    constructor(obj: any) {
        if (typeof obj === 'string') {
            const message = new QbsMessageItemResponse(obj);
            this._messages.push(message);
        } else if (obj) {
            const items = obj['items'] || [];
            for (const item of items) {
                const message = new QbsMessageItemResponse(item);
                this._messages.push(message);
            }
        }
    }

    isEmpty(): boolean { return this._messages.length === 0; }

    toString(): string {
        const list: string[] = [];
        for (const item of this._messages) {
            const s = item.toString();
            list.push(s);
        }
        return list.join('\n');
    }
}

// QBS session operation types and statuses.

export enum QbsOperationType { Resolve, Build, Clean, Install }
export enum QbsOperationStatus { Started, Completed, Failed }

export class QbsOperation {
    constructor(readonly _type: QbsOperationType, readonly _status: QbsOperationStatus, readonly _elapsed: number) {
    }
}
