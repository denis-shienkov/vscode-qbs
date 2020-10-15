import * as vscode from 'vscode';
import * as fs from 'fs';

import * as QbsUtils from './qbsutils';
import * as QbsConfig from './qbsconfig';
import {QbsSessionProtocol, QbsSessionProtocolStatus} from './qbssessionprotocol';
import {QbsSessionHelloResult,
        QbsSessionProcessResult,
        QbsSessionTaskStartedResult,
        QbsSessionTaskProgressResult,
        QbsSessionTaskMaxProgressResult,
        QbsSessionMessageResult} from './qbssessionresults';

export enum QbsSessionStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

export class QbsSession implements vscode.Disposable {
    private _protocol: QbsSessionProtocol = new QbsSessionProtocol();
    private _status: QbsSessionStatus = QbsSessionStatus.Stopped;
    private _projectUri!: vscode.Uri;
    private _profileName: string = '';
    private _configurationName: string = '';
    private _projectData: any = {};

    private _onStatusChanged: vscode.EventEmitter<QbsSessionStatus> = new vscode.EventEmitter<QbsSessionStatus>();
    private _onProjectUriChanged: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    private _onProfileNameChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    private _onConfigurationNameChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();

    private _onHelloReceived: vscode.EventEmitter<QbsSessionHelloResult> = new vscode.EventEmitter<QbsSessionHelloResult>();
    private _onProjectResolved: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onProjectBuilt: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onProjectCleaned: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onProjectInstalled: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onWarningMessageReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onLogMessageReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onTaskStarted: vscode.EventEmitter<QbsSessionTaskStartedResult> = new vscode.EventEmitter<QbsSessionTaskStartedResult>();
    private _onTaskProgressUpdated: vscode.EventEmitter<QbsSessionTaskProgressResult> = new vscode.EventEmitter<QbsSessionTaskProgressResult>();
    private _onTaskMaxProgressChanged: vscode.EventEmitter<QbsSessionTaskMaxProgressResult> = new vscode.EventEmitter<QbsSessionTaskMaxProgressResult>();
    private _onCommandDescriptionReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onProcessResultReceived: vscode.EventEmitter<QbsSessionProcessResult> = new vscode.EventEmitter<QbsSessionProcessResult>();
    
    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;
    readonly onProfileNameChanged: vscode.Event<string> = this._onProfileNameChanged.event;
    readonly onConfigurationNameChanged: vscode.Event<string> = this._onConfigurationNameChanged.event;

    readonly onHelloReceived: vscode.Event<QbsSessionHelloResult> = this._onHelloReceived.event;
    readonly onProjectResolved: vscode.Event<QbsSessionMessageResult> = this._onProjectResolved.event;
    readonly onProjectBuilt: vscode.Event<QbsSessionMessageResult> = this._onProjectBuilt.event;
    readonly onProjectCleaned: vscode.Event<QbsSessionMessageResult> = this._onProjectCleaned.event;
    readonly onProjectInstalled: vscode.Event<QbsSessionMessageResult> = this._onProjectInstalled.event;
    readonly onWarningMessageReceived: vscode.Event<QbsSessionMessageResult> = this._onWarningMessageReceived.event;
    readonly onLogMessageReceived: vscode.Event<QbsSessionMessageResult> = this._onLogMessageReceived.event;
    readonly onTaskStarted: vscode.Event<QbsSessionTaskStartedResult> = this._onTaskStarted.event;
    readonly onTaskProgressUpdated: vscode.Event<QbsSessionTaskProgressResult> = this._onTaskProgressUpdated.event;
    readonly onTaskMaxProgressChanged: vscode.Event<QbsSessionTaskMaxProgressResult> = this._onTaskMaxProgressChanged.event;
    readonly onCommandDescriptionReceived: vscode.Event<QbsSessionMessageResult> = this._onCommandDescriptionReceived.event;
    readonly onProcessResultReceived: vscode.Event<QbsSessionProcessResult> = this._onProcessResultReceived.event;

    constructor() {
        this._protocol.onStatusChanged(status => {
            switch (status) {
            case QbsSessionProtocolStatus.Started:
                this.status = QbsSessionStatus.Started;
                break;
            case QbsSessionProtocolStatus.Starting:
                this.status = QbsSessionStatus.Starting;
                break;
            case QbsSessionProtocolStatus.Stopped:
                this.status = QbsSessionStatus.Stopped;
                break;
            case QbsSessionProtocolStatus.Stopping:
                this.status = QbsSessionStatus.Stopping;
                break;
            }
        });

        this._protocol.onResponseReceived(response => this.parseResponse(response));
    }

    dispose() {
        this._protocol?.dispose();
    }

    async start() {
        if (this._status === QbsSessionStatus.Stopped) {
            const qbsPath = QbsConfig.fetchQbsPath();
            if (qbsPath.length > 0) {
                await this._protocol.start(qbsPath);
            }
        }
    }

    async stop() {
        if (this._status === QbsSessionStatus.Started) {
            await this._protocol.stop();
        }
    }

    async resolve() {
        let request: any = {};
        request['type'] = 'resolve-project';
        request['environment'] = process.env;
        request['data-mode'] = 'only-if-changed';
        request['module-properties'] = [
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

        if (this._projectUri) {
            request['project-file-path'] = QbsUtils.expandPath(this._projectUri.fsPath);
        }

        if (this._configurationName.length > 0) {
            request['configuration-name'] = this._configurationName;
        }

        if (this._profileName.length > 0) {
            request['top-level-profile'] = this._profileName;
        }

        const buildDirectory = QbsConfig.fetchQbsBuildDirectory();
        request['build-root'] = buildDirectory;
        request['dry-run'] = !fs.existsSync(buildDirectory);

        const settingsDirectory = QbsConfig.fetchQbsSettingsDirectory();
        if (settingsDirectory.length > 0) {
            request['settings-directory'] = settingsDirectory;
        }

        const forceProbes = QbsConfig.fetchQbsForceProbes();
        request['force-probe-execution'] = forceProbes;

        const errorHandlingMode = QbsConfig.fetchQbsErrorHandlingMode();
        request['error-handling-mode'] = errorHandlingMode;

        await this._protocol.sendRequest(request);
    }

    async build() {
        let request: any = {};
        request['type'] = 'build-project';
        request['data-mode'] = 'only-if-changed';

        const maxJobs = QbsConfig.fetchQbsMaxJobs();
        if (maxJobs > 0) {
            request['max-job-count'] = maxJobs;
        }

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        const showCommandLines = QbsConfig.fetchQbsShowCommandLines();
        request['command-echo-mode'] = showCommandLines ? 'command-line' : 'summary';

        await this._protocol.sendRequest(request);
    }

    async clean() {
        let request: any = {};
        request['type'] = 'clean-project';

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        await this._protocol.sendRequest(request);
    }

    async install() {
        let request: any = {};
        request['type'] = 'install-project';

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        await this._protocol.sendRequest(request);
    }

    async cancel() {
        let request: any = {};
        request['type'] = 'cancel-job';

        await this._protocol.sendRequest(request);
    }

    fetchProjectData(): any {
        return this._projectData;
    }

    set status(st: QbsSessionStatus) {
        if (st !== this._status) {
            this._status = st;
            this._onStatusChanged.fire(this._status);
        }
    }

    get status(): QbsSessionStatus {
        return this._status;
    }

    set projectUri(uri: vscode.Uri) {
        if (uri !== this._projectUri) {
            this._projectUri = uri;
            this._onProjectUriChanged.fire(this._projectUri);
        }
    }

    get projectUri(): vscode.Uri {
        return this._projectUri;
    }

    set profileName(name: string) {
        if (name !== this._profileName) {
            this._profileName = name;
            this._onProfileNameChanged.fire(this._profileName);
        }
    }

    get profileName(): string {
        return this._profileName;
    }

    set configurationName(name: string) {
        if (name !== this._configurationName) {
            this._configurationName = name;
            this._onConfigurationNameChanged.fire(this._configurationName);
        }
    }

    get configurationName(): string {
        return this._configurationName;
    }

    private parseResponse(response: any) {
        const type = response['type'];
        if (type === 'hello') {
            const result = new QbsSessionHelloResult(response)
            this._onHelloReceived.fire(result);
        } else if (type === 'project-resolved') {
            this.setProjectData(response, true);
            const result = new QbsSessionMessageResult(response['error']);
            this._onProjectResolved.fire(result);
        } else if (type === 'project-built' || type === 'build-done') {
            this.setProjectData(response, false);
            const result = new QbsSessionMessageResult(response['error']);
            this._onProjectBuilt.fire(result);
        } else if (type === 'project-cleaned') {
            const result = new QbsSessionMessageResult(response['error']);
            this._onProjectCleaned.fire(result);
        } else if (type === 'install-done') {
            const result = new QbsSessionMessageResult(response['error']);
            this._onProjectInstalled.fire(result);
        } else if (type === 'log-data') {
            const result = new QbsSessionMessageResult(response['message']);
            this._onLogMessageReceived.fire(result);
        } else if (type === 'warning') {
            const result = new QbsSessionMessageResult(response['warning']);
            this._onWarningMessageReceived.fire(result);
        } else if (type === 'task-started') {
            const result = new QbsSessionTaskStartedResult(response);
            this._onTaskStarted.fire(result);
        } else if (type === 'task-progress') {
            const result = new QbsSessionTaskProgressResult(response);
            this._onTaskProgressUpdated.fire(result);
        } else if (type === 'new-max-progress') {
            const result = new QbsSessionTaskMaxProgressResult(response);
            this._onTaskMaxProgressChanged.fire(result);
        } else if (type === 'generated-files-for-source') {
            // TODO: Implement me.
        } else if (type === 'command-description') {
            const result = new QbsSessionMessageResult(response['message']);
            this._onCommandDescriptionReceived.fire(result);
        } else if (type === 'files-added' || type === 'files-removed') {
            // TODO: Implement me.
        } else if (type === 'process-result') {
            const result = new QbsSessionProcessResult(response);
            this._onProcessResultReceived.fire(result);
        } else if (type === 'run-environment') {
            // TODO: Implement me.
        }
    }

    private setProjectData(response: any, withBuildSystemFiles: boolean) {
        const data = response['project-data'];
        if (data) {
            const files = data['build-system-files'];
            this._projectData = data;
            if (!withBuildSystemFiles)
                this._projectData['build-system-files'] = files;
        }
    }
}
