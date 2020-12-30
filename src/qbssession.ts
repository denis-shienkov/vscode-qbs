import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsProject} from './qbsproject';
import {QbsSessionProtocolStatus} from './qbssessionprotocol';
import {QbsSessionProtocol} from './qbssessionprotocol';
import {QbsSettingsEvent} from './qbssettings';
import {QbsSettings} from './qbssettings';

import {QbsDataKey} from './datatypes/qbskeys';
import {QbsOperation} from './datatypes/qbsoperation';
import {QbsProjectData} from './datatypes/qbsprojectdata';
import {QbsRunEnvironmentData} from './datatypes/qbsrunenvironmentdata';

import {QbsCommandKey} from './commands/qbscommandkey';

// Protocol request.
import {QbsRequest} from './datatypes/qbsrequest';

// Protocol responses.
import {QbsHelloResponse} from './datatypes/qbshelloresponse';
import {QbsMessageResponse} from './datatypes/qbsmessageresponse';
import {QbsProcessResponse} from './datatypes/qbsprocessresponse';
import {QbsTaskMaxProgressResponse} from './datatypes/qbstaskmaxprogressresponse';
import {QbsTaskProgressResponse} from './datatypes/qbstaskprogressresponse';
import {QbsTaskStartedResponse} from './datatypes/qbstaskstartedresponse';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

const ACTIVE_PROJECT_KEY = 'ActiveProject';
const AUTO_RESOLVE_TIMEOUT = 1000;

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
    private _onRunEnvironmentReceived: vscode.EventEmitter<QbsRunEnvironmentData> = new vscode.EventEmitter<QbsRunEnvironmentData>();
    private _onProtocolErrorMessageReceived: vscode.EventEmitter<QbsMessageResponse> = new vscode.EventEmitter<QbsMessageResponse>();

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
    readonly onRunEnvironmentReceived: vscode.Event<QbsRunEnvironmentData> = this._onRunEnvironmentReceived.event;
    readonly onProtocolErrorMessageReceived: vscode.Event<QbsMessageResponse> = this._onProtocolErrorMessageReceived.event;

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
                    await this.autoResolve(AUTO_RESOLVE_TIMEOUT);
                }
            } else if (event === QbsSettingsEvent.SessionRestartRequired) {
                await vscode.commands.executeCommand(QbsCommandKey.AutoRestartSession);
            } else if (event === QbsSettingsEvent.DebuggerUpdateRequired) {
                await this._project?.runStep().restore();
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
        const project = this.extensionContext().workspaceState.get<vscode.Uri>(ACTIVE_PROJECT_KEY);
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
        await this.extensionContext().workspaceState.update(ACTIVE_PROJECT_KEY, this._project?.uri());
    }

    async autoResolve(interval: number) {
        if (this._timer) {
            clearTimeout(this._timer);
        }
        this._timer = setTimeout(async () => {
            await vscode.commands.executeCommand(QbsCommandKey.Resolve);
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
        const type = response[QbsDataKey.Type];
        if (type === QbsDataKey.Hello) {
            const result = new QbsHelloResponse(response)
            this._onHelloReceived.fire(result);
        } else if (type === QbsDataKey.ProjectResolved) {
            const data = new QbsProjectData(response[QbsDataKey.ProjectData]);
            if (!data.isEmpty()) {
                await this._project?.setData(data, true);
            }
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onProjectResolved.fire(result);
        } else if (type === QbsDataKey.ProjectBuilt || type === QbsDataKey.ProjectDone) {
            const data = new QbsProjectData(response[QbsDataKey.ProjectData]);
            if (!data.isEmpty()) {
                await this._project?.setData(data, false);
            }
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onProjectBuilt.fire(result);
        } else if (type === QbsDataKey.ProjectCleaned) {
            await this._project?.updateSteps();
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onProjectCleaned.fire(result);
        } else if (type === QbsDataKey.InstallDone) {
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onProjectInstalled.fire(result);
        } else if (type === QbsDataKey.LogData) {
            const result = new QbsMessageResponse(response[QbsDataKey.Message]);
            this._onLogMessageReceived.fire(result);
        } else if (type === QbsDataKey.Warning) {
            const result = new QbsMessageResponse(response[QbsDataKey.Warning]);
            this._onWarningMessageReceived.fire(result);
        } else if (type === QbsDataKey.TaskStarted) {
            const result = new QbsTaskStartedResponse(response);
            this._onTaskStarted.fire(result);
        } else if (type === QbsDataKey.TaskProgress) {
            const result = new QbsTaskProgressResponse(response);
            this._onTaskProgressUpdated.fire(result);
        } else if (type === QbsDataKey.NewMaxProgress) {
            const result = new QbsTaskMaxProgressResponse(response);
            this._onTaskMaxProgressChanged.fire(result);
        } else if (type === QbsDataKey.GeneratedFilesForSource) {
            // TODO: Implement me.
        } else if (type === QbsDataKey.CommandDescription) {
            const result = new QbsMessageResponse(response[QbsDataKey.Message]);
            this._onCommandDescriptionReceived.fire(result);
        } else if (type === QbsDataKey.FilesAdded || type === QbsDataKey.FilesRemoved) {
            // TODO: Implement me.
        } else if (type === QbsDataKey.ProcessResult) {
            const result = new QbsProcessResponse(response);
            this._onProcessResultReceived.fire(result);
        } else if (type === QbsDataKey.RunEnvironment) {
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onRunEnvironmentResultReceived.fire(result);
            const env = new QbsRunEnvironmentData(response[QbsDataKey.FullEnvironment]);
            this._onRunEnvironmentReceived.fire(env);
        } else if (type === QbsDataKey.ProtocolError) {
            const result = new QbsMessageResponse(response[QbsDataKey.Error]);
            this._onProtocolErrorMessageReceived.fire(result);
        }
    }

    private async setStatus(status: QbsSessionStatus) {
        if (status !== this._status) {
            this._status = status;
            this._onStatusChanged.fire(this._status);
            if (status === QbsSessionStatus.Started) {
                await vscode.commands.executeCommand(QbsCommandKey.RestoreProject);
            }
        }
    }
}
