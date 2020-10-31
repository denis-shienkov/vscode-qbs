import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsProject} from './qbsproject';
import {QbsSettings, QbsSettingsEvent} from './qbssettings';
import {
    QbsSessionProtocol, QbsSessionProtocolStatus
} from './qbssessionprotocol';
import {
    QbsOperation, QbsRunEnvironmentData,
    // Protocol requests.
    QbsGetRunEnvironmentRequest, QbsRequest,
    // Protocol responses.
    QbsHelloResponse, QbsProcessResponse,
    QbsTaskStartedResponse, QbsTaskProgressResponse,
    QbsTaskMaxProgressResponse, QbsMessageResponse, QbsProjectData
} from './qbstypes';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export enum QbsSessionStatus { Stopped, Started, Stopping, Starting }

export class QbsSession implements vscode.Disposable {
    private _timer?: NodeJS.Timeout;
    private _settings: QbsSettings = new QbsSettings(this);
    private _protocol: QbsSessionProtocol = new QbsSessionProtocol();
    private _status: QbsSessionStatus = QbsSessionStatus.Stopped;
    private _project?: QbsProject;

    private _onOperationChanged: vscode.EventEmitter<QbsOperation> = new vscode.EventEmitter<QbsOperation>();
    private _onStatusChanged: vscode.EventEmitter<QbsSessionStatus> = new vscode.EventEmitter<QbsSessionStatus>();
    private _onProjectActivated: vscode.EventEmitter<QbsProject> = new vscode.EventEmitter<QbsProject>();

    private _onHelloReceived: vscode.EventEmitter<QbsHelloResponse> = new vscode.EventEmitter<QbsHelloResponse>();
    private _onProjectResolved: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onProjectBuilt: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onProjectCleaned: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onProjectInstalled: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onWarningMessageReceived: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onLogMessageReceived: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onTaskStarted: vscode.EventEmitter<QbsTaskStartedResponse> = new vscode.EventEmitter<QbsTaskStartedResponse>();
    private _onTaskProgressUpdated: vscode.EventEmitter<QbsTaskProgressResponse> = new vscode.EventEmitter<QbsTaskProgressResponse>();
    private _onTaskMaxProgressChanged: vscode.EventEmitter<QbsTaskMaxProgressResponse> = new vscode.EventEmitter<QbsTaskMaxProgressResponse>();
    private _onCommandDescriptionReceived: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();
    private _onProcessResultReceived: vscode.EventEmitter<QbsProcessResponse> = new vscode.EventEmitter<QbsProcessResponse>();
    private _onRunEnvironmentResultReceived: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();

    readonly onOperationChanged: vscode.Event<QbsOperation> = this._onOperationChanged.event;
    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectActivated: vscode.Event<QbsProject> = this._onProjectActivated.event;

    readonly onHelloReceived: vscode.Event<QbsHelloResponse> = this._onHelloReceived.event;
    readonly onProjectResolved: vscode.Event<QbsMessageResponse> = this._onProjectResolved.event;
    readonly onProjectBuilt: vscode.Event<QbsMessageResponse> = this._onProjectBuilt.event;
    readonly onProjectCleaned: vscode.Event<QbsMessageResponse> = this._onProjectCleaned.event;
    readonly onProjectInstalled: vscode.Event<QbsMessageResponse> = this._onProjectInstalled.event;
    readonly onWarningMessageReceived: vscode.Event<QbsMessageResponse> = this._onWarningMessageReceived.event;
    readonly onLogMessageReceived: vscode.Event<QbsMessageResponse> = this._onLogMessageReceived.event;
    readonly onTaskStarted: vscode.Event<QbsTaskStartedResponse> = this._onTaskStarted.event;
    readonly onTaskProgressUpdated: vscode.Event<QbsTaskProgressResponse> = this._onTaskProgressUpdated.event;
    readonly onTaskMaxProgressChanged: vscode.Event<QbsTaskMaxProgressResponse> = this._onTaskMaxProgressChanged.event;
    readonly onCommandDescriptionReceived: vscode.Event<QbsMessageResponse> = this._onCommandDescriptionReceived.event;
    readonly onProcessResultReceived: vscode.Event<QbsProcessResponse> = this._onProcessResultReceived.event;
    readonly onRunEnvironmentResultReceived: vscode.Event<QbsMessageResponse> = this._onRunEnvironmentResultReceived.event;

    constructor(private readonly _ctx: vscode.ExtensionContext) {
        // Handle the events from the protocol object.
        this._protocol.onStatusChanged(async (protocolStatus) => {
            switch (protocolStatus) {
            case QbsSessionProtocolStatus.Started:
                await this.setStatus(QbsSessionStatus.Started);
                break;
            case QbsSessionProtocolStatus.Starting:
                await this.setStatus(QbsSessionStatus.Starting);
                break;
            case QbsSessionProtocolStatus.Stopped:
                await this.setStatus(QbsSessionStatus.Stopped);
                break;
            case QbsSessionProtocolStatus.Stopping:
                await this.setStatus(QbsSessionStatus.Stopping);
                break;
            }
        });
        this._protocol.onResponseReceived(async (response) => await this.parseResponse(response));

        // Handle the events from the settings object.
        this._settings.onChanged(async (event) => {
            if (event === QbsSettingsEvent.ProjectResolveRequired) {
                if (this._project) {
                    await this.autoResolve(0);
                }
            } else if (event === QbsSettingsEvent.SessionRestartRequired) {
                await vscode.commands.executeCommand('qbs.autoRestartSession');
            }
        });
    }

    dispose() {
        this._protocol?.dispose();
        this._project?.dispose();
        this._settings?.dispose();
    }

    extensionContext() { return this._ctx; }
    project(): QbsProject | undefined { return this._project; }
    settings(): QbsSettings { return this._settings; }
    status(): QbsSessionStatus { return this._status; }

    async emitOperation(operation: QbsOperation) { this._onOperationChanged.fire(operation); }
    async resolve(request: QbsRequest) { await this.sendRequest(request); }
    async build(request: QbsRequest) { await this.sendRequest(request); }
    async clean(request: QbsRequest) { await this.sendRequest(request); }
    async install(request: QbsRequest) { await this.sendRequest(request); }
    async cancel(request: QbsRequest) { await this.sendRequest(request); }
    async getRunEnvironment(request: QbsRequest) { await this.sendRequest(request); }

    async start() {
        if (this._status === QbsSessionStatus.Stopped) {
            const qbsPath = this._settings.executablePath();
            if (qbsPath.length) {
                await this._protocol.start(qbsPath);
            }
        }
    }

    async stop() {
        if (this._status === QbsSessionStatus.Started) {
            await this._protocol.stop();
        }
    }

    async ensureRunEnvironmentUpdated() {
        return new Promise<boolean>(resolve => {
            const runEnvironmentResultReceivedSubscription = this.onRunEnvironmentResultReceived(result => {
                runEnvironmentResultReceivedSubscription.dispose();
                resolve(result.isEmpty());
            });
            const envRequest = new QbsGetRunEnvironmentRequest(this.settings());
            envRequest.setProductName(this._project?.runStep().productName() || '');
            this.getRunEnvironment(envRequest);
        });
    }

    async setupProject(uri?: vscode.Uri) {
        const _uri = this.project()?.uri();
        if (uri?.path === _uri?.path) {
            return;
        }

        this._project?.dispose();
        this._project = new QbsProject(this, uri);
        await this._project.restore();
        await this.saveProject();
        this._onProjectActivated.fire(this._project);

        this._project.buildStep().onChanged(async (autoResolveRequired) => {
            if (autoResolveRequired) {
                await this.autoResolve(200);
            }
        })
    }

    async restoreProject() {
        const project = this.extensionContext().workspaceState.get<vscode.Uri>('ActiveProject');
        if (project) {
            await this.setupProject(project);
        } else {
            const projects = await QbsProject.enumerateWorkspaceProjects();
            if (projects && projects.length) {
                await this.setupProject(projects[0]);
            }
        }
    }

    async saveProject() {
        await this.extensionContext().workspaceState.update('ActiveProject', this._project?.uri());
    }

    async autoResolve(interval: number) {
        if (this._timer) {
            clearTimeout(this._timer);
        }
        this._timer = setTimeout(async () => {
            await vscode.commands.executeCommand('qbs.resolve');
            this._timer = undefined;
        }, interval);
    }

    /**
     * Returns the localized QBS session @c status name.
     */
    static statusName(status: QbsSessionStatus): string {
        switch (status) {
        case QbsSessionStatus.Started:
            return localize('qbs.session.status.started', "started");
        case QbsSessionStatus.Starting:
            return localize('qbs.session.status.starting', "starting");
        case QbsSessionStatus.Stopped:
            return localize('qbs.session.status.stopped', "stopped");
        case QbsSessionStatus.Stopping:
            return localize('qbs.session.status.stopping', "stopping");
        }
    }

    private async sendRequest(request: any) { await this._protocol.sendRequest(request); }

    private async parseResponse(response: any) {
        const type = response['type'];
        if (type === 'hello') {
            const result = new QbsHelloResponse(response)
            this._onHelloReceived.fire(result);
        } else if (type === 'project-resolved') {
            const data = new QbsProjectData(response['project-data']);
            await this._project?.setData(data, true);
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response['error']);
            this._onProjectResolved.fire(result);
        } else if (type === 'project-built' || type === 'build-done') {
            const data = new QbsProjectData(response['project-data']);
            await this._project?.setData(data, false);
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response['error']);
            this._onProjectBuilt.fire(result);
        } else if (type === 'project-cleaned') {
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response['error']);
            this._onProjectCleaned.fire(result);
        } else if (type === 'install-done') {
            const result = new QbsMessageResponse(response['error']);
            this._onProjectInstalled.fire(result);
        } else if (type === 'log-data') {
            const result = new QbsMessageResponse(response['message']);
            this._onLogMessageReceived.fire(result);
        } else if (type === 'warning') {
            const result = new QbsMessageResponse(response['warning']);
            this._onWarningMessageReceived.fire(result);
        } else if (type === 'task-started') {
            const result = new QbsTaskStartedResponse(response);
            this._onTaskStarted.fire(result);
        } else if (type === 'task-progress') {
            const result = new QbsTaskProgressResponse(response);
            this._onTaskProgressUpdated.fire(result);
        } else if (type === 'new-max-progress') {
            const result = new QbsTaskMaxProgressResponse(response);
            this._onTaskMaxProgressChanged.fire(result);
        } else if (type === 'generated-files-for-source') {
            // TODO: Implement me.
        } else if (type === 'command-description') {
            const result = new QbsMessageResponse(response['message']);
            this._onCommandDescriptionReceived.fire(result);
        } else if (type === 'files-added' || type === 'files-removed') {
            // TODO: Implement me.
        } else if (type === 'process-result') {
            const result = new QbsProcessResponse(response);
            this._onProcessResultReceived.fire(result);
        } else if (type === 'run-environment') {
            const env = new QbsRunEnvironmentData(response['full-environment']);
            this._project?.setRunEnvironment(env);
            const result = new QbsMessageResponse(response['error']);
            this._onRunEnvironmentResultReceived.fire(result);
        }
    }

    private async setStatus(status: QbsSessionStatus) {
        if (status !== this._status) {
            this._status = status;
            this._onStatusChanged.fire(this._status);
            if (status === QbsSessionStatus.Started) {
                await vscode.commands.executeCommand('qbs.restoreProject');
            }
        }
    }
}
