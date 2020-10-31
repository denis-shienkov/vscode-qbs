import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';

import {QbsSettings} from './qbssettings';

export enum QbsSessionProtocolStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

const PACKET_PREAMBLE = "qbsmsg:";

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

export class QbsSessionProtocol implements vscode.Disposable {
    private _input: string = '';
    private _expectedLength: number = -1;
    private _status: QbsSessionProtocolStatus = QbsSessionProtocolStatus.Stopped;
    private _process?: cp.ChildProcess;
    private _onStatusChanged: vscode.EventEmitter<QbsSessionProtocolStatus> = new vscode.EventEmitter<QbsSessionProtocolStatus>();
    private _onResponseReceived: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

    readonly onStatusChanged: vscode.Event<QbsSessionProtocolStatus> = this._onStatusChanged.event;
    readonly onResponseReceived: vscode.Event<any> = this._onResponseReceived.event;

    constructor() {}

    dispose() {}

    status(): QbsSessionProtocolStatus { return this._status; }

    async start(qbsPath: string) {
        this._input = '';
        this._expectedLength = -1;
        await this.setStatus(QbsSessionProtocolStatus.Starting);
        this._process = cp.spawn(qbsPath, ['session']);

        this._process.stdout?.on('data', async (data) => {
            await  this.setStatus(QbsSessionProtocolStatus.Started);
            this._input += data;
            await this.parseStdOutput();
        });

        this._process.stderr?.on('data', async (data) => {
            // TODO: Implement me.
        });

        this._process.on('close', async (code) => {
            // TODO: Implement me.
            await this.setStatus(QbsSessionProtocolStatus.Stopped);
        });
    }

    async stop() {
        await this.setStatus(QbsSessionProtocolStatus.Stopping);
        this._process?.kill();
    }

    async sendRequest(request: QbsRequest) {
        const json = JSON.stringify(request.data());
        const data = Buffer.from(json, 'binary').toString('base64');
        const output = PACKET_PREAMBLE + data.length + '\n' + data;
        this._process?.stdin?.write(output);
    }

    private async setStatus(status: QbsSessionProtocolStatus) {
        if (status === this._status)
            return;
        this._status = status;
        this._onStatusChanged.fire(this._status);
    }

    private async parseStdOutput() {
        for (;;) {
            if (this._expectedLength === -1) {
                const preambleIndex = this._input.indexOf(PACKET_PREAMBLE);
                if (preambleIndex === -1)
                    break;
                const numberOffset = preambleIndex + PACKET_PREAMBLE.length;
                const newLineOffset = this._input.indexOf('\n', numberOffset);
                if (newLineOffset === -1)
                    return;
                const sizeString = this._input.substring(numberOffset, newLineOffset);
                const length = parseInt(sizeString);
                if (isNaN(length) || length < 0) {
                    // TODO: Implement me.
                } else {
                    this._expectedLength = length;
                }
                this._input = this._input.substring(newLineOffset + 1);
            } else {
                if (this._input.length < this._expectedLength)
                    break;
                const data = this._input.substring(0, this._expectedLength);
                this._input = this._input.slice(this._expectedLength);
                this._expectedLength = -1;
                const json = Buffer.from(data, 'base64').toString('binary');
                const response = JSON.parse(json);
                this._onResponseReceived.fire(response);
            }
        }
    }
}
