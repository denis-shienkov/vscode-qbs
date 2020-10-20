import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as fs from 'fs';

import * as QbsConfig from './qbsconfig';

import {QbsProject} from './qbsproject';
import {QbsRunEnvironment} from './qbsrunenvironment';

import {
    QbsSessionProtocol,
    QbsSessionProtocolStatus
} from './qbssessionprotocol';

import {
    QbsSessionHelloResult,
    QbsSessionProcessResult,
    QbsSessionTaskStartedResult,
    QbsSessionTaskProgressResult,
    QbsSessionTaskMaxProgressResult,
    QbsSessionMessageResult
} from './qbssessionresults';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export enum QbsSessionStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

export class QbsSession implements vscode.Disposable {
    private _protocol: QbsSessionProtocol = new QbsSessionProtocol();
    private _status: QbsSessionStatus = QbsSessionStatus.Stopped;
    private _project?: QbsProject;

    private _onStatusChanged: vscode.EventEmitter<QbsSessionStatus> = new vscode.EventEmitter<QbsSessionStatus>();
    private _onProjectActivated: vscode.EventEmitter<QbsProject> = new vscode.EventEmitter<QbsProject>();

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
    private _onRunEnvironmentResultReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();

    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectActivated: vscode.Event<QbsProject> = this._onProjectActivated.event;

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
    readonly onRunEnvironmentResultReceived: vscode.Event<QbsSessionMessageResult> = this._onRunEnvironmentResultReceived.event;

    constructor() {
         this._protocol.onStatusChanged(protocolStatus => {
            switch (protocolStatus) {
            case QbsSessionProtocolStatus.Started:
                this.setStatus(QbsSessionStatus.Started);
                break;
            case QbsSessionProtocolStatus.Starting:
                this.setStatus(QbsSessionStatus.Starting);
                break;
            case QbsSessionProtocolStatus.Stopped:
                this.setStatus(QbsSessionStatus.Stopped);
                break;
            case QbsSessionProtocolStatus.Stopping:
                this.setStatus(QbsSessionStatus.Stopping);
                break;
            }
        });

        this._protocol.onResponseReceived(response => this.parseResponse(response));
    }

    dispose() {
        this._protocol?.dispose();
        this._project?.dispose();
    }

    project(): QbsProject | undefined {
        return this._project;
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

    async resolveProject() {
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

        request['project-file-path'] = this._project?.filePath();
        request['configuration-name'] = this._project?.buildStep().configurationName();
        request['top-level-profile'] = this._project?.buildStep().profileName();

        const buildDirectory = QbsConfig.fetchQbsBuildDirectory();
        request['build-root'] = buildDirectory;
        // Do not store the build graph if the build directory does not exist yet.
        request['dry-run'] = !fs.existsSync(buildDirectory);

        const settingsDirectory = QbsConfig.fetchQbsSettingsDirectory();
        if (settingsDirectory.length > 0) {
            request['settings-directory'] = settingsDirectory;
        }

        const forceProbes = QbsConfig.fetchQbsForceProbes();
        request['force-probe-execution'] = forceProbes;

        const errorHandlingMode = QbsConfig.fetchQbsErrorHandlingMode();
        request['error-handling-mode'] = errorHandlingMode;

        const logLevel = QbsConfig.fetchQbsLogLevel();
        request['log-level'] = logLevel;

        await this.sendRequest(request);
    }

    async buildProject() {
        let request: any = {};
        request['type'] = 'build-project';
        request['data-mode'] = 'only-if-changed';
        request['install'] = true;
        request['products'] = [this._project?.buildStep().productName()];

        const maxJobs = QbsConfig.fetchQbsMaxJobs();
        if (maxJobs > 0) {
            request['max-job-count'] = maxJobs;
        }

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        const showCommandLines = QbsConfig.fetchQbsShowCommandLines();
        request['command-echo-mode'] = showCommandLines ? 'command-line' : 'summary';

        const logLevel = QbsConfig.fetchQbsLogLevel();
        request['log-level'] = logLevel;

        const cleanInstallRoot = QbsConfig.fetchQbsCleanInstallRoot();
        request['clean-install-root'] = cleanInstallRoot;

        await this.sendRequest(request);
    }

    async cleanProject() {
        let request: any = {};
        request['type'] = 'clean-project';
        request['products'] = [this._project?.buildStep().productName()];

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        const logLevel = QbsConfig.fetchQbsLogLevel();
        request['log-level'] = logLevel;

        await this.sendRequest(request);
    }

    async installProject() {
        let request: any = {};
        request['type'] = 'install-project';

        const keepGoing = QbsConfig.fetchQbsKeepGoing();
        request['keep-going'] = keepGoing;

        const logLevel = QbsConfig.fetchQbsLogLevel();
        request['log-level'] = logLevel;

        await this.sendRequest(request);
    }

    async cancelJob() {
        let request: any = {};
        request['type'] = 'cancel-job';

        await this.sendRequest(request);
    }

    async getRunEnvironment() {
        let request: any = {};
        request['type'] = 'get-run-environment';
        request['product'] = this._project?.runStep().productName();

        await this.sendRequest(request);
    }

    async setActiveProject(uri?: vscode.Uri) {
        const _uri = this.project()?.uri();
        if (uri?.path !== _uri?.path) {
            this._project?.dispose();
            this._project = new QbsProject(uri);
            this._onProjectActivated.fire(this._project);
        }
    }

    activeProject(): QbsProject | undefined {
        return this._project;
    }

    status(): QbsSessionStatus {
        return this._status;
    }

    /**
     * Returns the localized QBS session @c status name.
     */
    static statusName(status: QbsSessionStatus): string {
        switch (status) {
        case QbsSessionStatus.Started:
            return localize('qbs.session.status.started', "started");
        case QbsSessionStatus.Starting:
            return localize('qbs.session.status.started', "starting");
        case QbsSessionStatus.Stopped:
            return localize('qbs.session.status.started', "stopped");
        case QbsSessionStatus.Stopping:
            return localize('qbs.session.status.started', "stopping");
        }
    }

    private async sendRequest(request: any) {
        await this._protocol.sendRequest(request);
    }

    private parseResponse(response: any) {
        const type = response['type'];
        if (type === 'hello') {
            const result = new QbsSessionHelloResult(response)
            this._onHelloReceived.fire(result);
        } else if (type === 'project-resolved') {
            this._project?.setData(response, true);
            const result = new QbsSessionMessageResult(response['error']);
            this._onProjectResolved.fire(result);
        } else if (type === 'project-built' || type === 'build-done') {
            this._project?.setData(response, false);
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
            const env = new QbsRunEnvironment(response['full-environment']);
            this._project?.setRunEnvironment(env);
            const result = new QbsSessionMessageResult(response['error']);
            this._onRunEnvironmentResultReceived.fire(result);
        }
    }

    private setStatus(status: QbsSessionStatus) {
        if (status !== this._status) {
            this._status = status;
            this._onStatusChanged.fire(this._status);
        }
    }
}
