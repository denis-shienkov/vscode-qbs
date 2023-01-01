import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import * as which from 'which';

import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsProtocolDataKey } from './protocol/qbsprotocoldatakey';
import { QbsProtocolEngine } from './protocol/qbsprotocolengine';
import { QbsProtocolEngineState } from './protocol/qbsprotocolengine';
import { QbsProtocolProjectData } from './protocol/qbsprotocolprojectdata';
import { QbsProtocolRunEnvironmentData } from './protocol/qbsprotocolrunenvironmentdata';
import { QbsSettings } from './qbssettings';

// Protocol request.
import { QbsProtocolRequest } from './protocol/qbsprotocolrequest';
// Protocol responses.
import { QbsProtocolHelloResponse } from './protocol/qbsprotocolhelloresponse';
import { QbsProtocolMessageResponse } from './protocol/qbsprotocolmessageresponse';
import { QbsProtocolProcessResponse } from './protocol/qbsprotocolprocessresponse';
import { QbsProtocolTaskMaxProgressResponse } from './protocol/qbsprotocoltaskmaxprogressresponse';
import { QbsProtocolTaskProgressResponse } from './protocol/qbsprotocoltaskprogressresponse';
import { QbsProtocolTaskStartedResponse } from './protocol/qbsprotocoltaskstartedresponse';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export enum QbsSessionState { Started, Starting, Stopped, Stopping }

export class QbsSessionProjectData {
    public constructor(
        public readonly data?: QbsProtocolProjectData,
        public readonly message?: QbsProtocolMessageResponse) {
    }
}

export class QbsSession implements vscode.Disposable {
    private engine: QbsProtocolEngine = new QbsProtocolEngine();
    private state: QbsSessionState = QbsSessionState.Stopped;

    private readonly stateChanged: vscode.EventEmitter<QbsSessionState> = new vscode.EventEmitter<QbsSessionState>();

    private readonly commandDescriptionReceived: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly errorMessageReceived: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly helloReceived: vscode.EventEmitter<QbsProtocolHelloResponse> = new vscode.EventEmitter<QbsProtocolHelloResponse>();
    private readonly logMessageReceived: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly processResultReceived: vscode.EventEmitter<QbsProtocolProcessResponse> = new vscode.EventEmitter<QbsProtocolProcessResponse>();
    private readonly projectBuilt: vscode.EventEmitter<QbsSessionProjectData> = new vscode.EventEmitter<QbsSessionProjectData>();
    private readonly projectCleaned: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly projectInstalled: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly projectResolved: vscode.EventEmitter<QbsSessionProjectData> = new vscode.EventEmitter<QbsSessionProjectData>();
    private readonly runEnvironmentReceived: vscode.EventEmitter<QbsProtocolRunEnvironmentData> = new vscode.EventEmitter<QbsProtocolRunEnvironmentData>();
    private readonly runEnvironmentResultReceived: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();
    private readonly taskMaxProgressChanged: vscode.EventEmitter<QbsProtocolTaskMaxProgressResponse> = new vscode.EventEmitter<QbsProtocolTaskMaxProgressResponse>();
    private readonly taskProgressUpdated: vscode.EventEmitter<QbsProtocolTaskProgressResponse> = new vscode.EventEmitter<QbsProtocolTaskProgressResponse>();
    private readonly taskStarted: vscode.EventEmitter<QbsProtocolTaskStartedResponse> = new vscode.EventEmitter<QbsProtocolTaskStartedResponse>();
    private readonly warningMessageReceived: vscode.EventEmitter<QbsProtocolMessageResponse> = new vscode.EventEmitter<QbsProtocolMessageResponse>();

    public readonly onStateChanged: vscode.Event<QbsSessionState> = this.stateChanged.event;

    public readonly onCommandDescriptionReceived: vscode.Event<QbsProtocolMessageResponse> = this.commandDescriptionReceived.event;
    public readonly onErrorMessageReceived: vscode.Event<QbsProtocolMessageResponse> = this.errorMessageReceived.event;
    public readonly onHelloReceived: vscode.Event<QbsProtocolHelloResponse> = this.helloReceived.event;
    public readonly onLogMessageReceived: vscode.Event<QbsProtocolMessageResponse> = this.logMessageReceived.event;
    public readonly onProcessResultReceived: vscode.Event<QbsProtocolProcessResponse> = this.processResultReceived.event;
    public readonly onProjectBuilt: vscode.Event<QbsSessionProjectData> = this.projectBuilt.event;
    public readonly onProjectCleaned: vscode.Event<QbsProtocolMessageResponse> = this.projectCleaned.event;
    public readonly onProjectInstalled: vscode.Event<QbsProtocolMessageResponse> = this.projectInstalled.event;
    public readonly onProjectResolved: vscode.Event<QbsSessionProjectData> = this.projectResolved.event;
    public readonly onRunEnvironmentReceived: vscode.Event<QbsProtocolRunEnvironmentData> = this.runEnvironmentReceived.event;
    public readonly onRunEnvironmentResultReceived: vscode.Event<QbsProtocolMessageResponse> = this.runEnvironmentResultReceived.event;
    public readonly onTaskMaxProgressChanged: vscode.Event<QbsProtocolTaskMaxProgressResponse> = this.taskMaxProgressChanged.event;
    public readonly onTaskProgressUpdated: vscode.Event<QbsProtocolTaskProgressResponse> = this.taskProgressUpdated.event;
    public readonly onTaskStarted: vscode.Event<QbsProtocolTaskStartedResponse> = this.taskStarted.event;
    public readonly onWarningMessageReceived: vscode.Event<QbsProtocolMessageResponse> = this.warningMessageReceived.event;

    public constructor(context: vscode.ExtensionContext) {
        // Register the commands related to the session.
        this.registerCommandsHandlers(context);
        // Handle the events from the protocol object.
        this.registerEngineHandlers();
    }

    public dispose(): void { this.engine.dispose(); }

    public getState(): QbsSessionState { return this.state; }

    public async resolve(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }
    public async build(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }
    public async clean(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }
    public async install(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }
    public async cancel(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }
    public async getRunEnvironment(request: QbsProtocolRequest): Promise<void> { await this.sendRequest(request); }

    /** Starts the Qbs session by starting the Qbs executable as a process in session
     * mode and subscribes to its data. */
    public async startSession(qbsExe: string): Promise<void> {
        if (this.state !== QbsSessionState.Stopped) {
            return;
        } else if (!await QbsSession.ensureQbsPathIsSet(qbsExe)) {
            await this.stopSession();
            return;
        }
        await this.engine.start(qbsExe);
    }

    /** Stops the Qbs session by stopping the Qbs executable process. */
    public async stopSession(): Promise<void> {
        if (this.state !== QbsSessionState.Started)
            return;
        await this.engine.stop();
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.StartSession, async () => {
            await this.startSession(QbsSettings.getQbsPath());
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.StopSession, async () => {
            await this.stopSession();
        }));
    }

    private registerEngineHandlers(): void {
        this.engine.onStateChanged(async (status) => { await this.setState(QbsSession.convert(status)) });
        this.engine.onResponseReceived(async (response) => { await this.parseResponse(response) });
    }

    /** Sends the specified @c request command to the Qbs session process. */
    private async sendRequest(request: any): Promise<void> { await this.engine.sendRequest(request); }

    /** Parses the received Qbs session process responses or notifications @c response. */
    private async parseResponse(response: any): Promise<void> {
        const type = response[QbsProtocolDataKey.Type];
        if (type === QbsProtocolDataKey.Hello) {
            const result = new QbsProtocolHelloResponse(response)
            this.helloReceived.fire(result);
        } else if (type === QbsProtocolDataKey.ProjectResolved) {
            const data = new QbsProtocolProjectData(response[QbsProtocolDataKey.ProjectData]);
            const msg = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.projectResolved.fire(new QbsSessionProjectData(data, msg));
        } else if (type === QbsProtocolDataKey.ProjectBuilt || type === QbsProtocolDataKey.ProjectDone) {
            const data = new QbsProtocolProjectData(response[QbsProtocolDataKey.ProjectData]);
            const msg = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.projectBuilt.fire(new QbsSessionProjectData(data, msg));
        } else if (type === QbsProtocolDataKey.ProjectCleaned) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.projectCleaned.fire(result);
        } else if (type === QbsProtocolDataKey.InstallDone) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.projectInstalled.fire(result);
        } else if (type === QbsProtocolDataKey.LogData) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Message]);
            this.logMessageReceived.fire(result);
        } else if (type === QbsProtocolDataKey.Warning) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Warning]);
            this.warningMessageReceived.fire(result);
        } else if (type === QbsProtocolDataKey.TaskStarted) {
            const result = new QbsProtocolTaskStartedResponse(response);
            this.taskStarted.fire(result);
        } else if (type === QbsProtocolDataKey.TaskProgress) {
            const result = new QbsProtocolTaskProgressResponse(response);
            this.taskProgressUpdated.fire(result);
        } else if (type === QbsProtocolDataKey.NewMaxProgress) {
            const result = new QbsProtocolTaskMaxProgressResponse(response);
            this.taskMaxProgressChanged.fire(result);
        } else if (type === QbsProtocolDataKey.GeneratedFilesForSource) {
            // TODO: Implement me.
        } else if (type === QbsProtocolDataKey.CommandDescription) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Message]);
            this.commandDescriptionReceived.fire(result);
        } else if (type === QbsProtocolDataKey.FilesAdded || type === QbsProtocolDataKey.FilesRemoved) {
            // TODO: Implement me.
        } else if (type === QbsProtocolDataKey.ProcessResult) {
            const result = new QbsProtocolProcessResponse(response);
            this.processResultReceived.fire(result);
        } else if (type === QbsProtocolDataKey.RunEnvironment) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.runEnvironmentResultReceived.fire(result);
            const env = new QbsProtocolRunEnvironmentData(response[QbsProtocolDataKey.FullEnvironment]);
            this.runEnvironmentReceived.fire(env);
        } else if (type === QbsProtocolDataKey.ProtocolError) {
            const result = new QbsProtocolMessageResponse(response[QbsProtocolDataKey.Error]);
            this.errorMessageReceived.fire(result);
        }
    }

    /** Updates the Qbs session @c status received from the process. If the status is `Started`
     * then tries to re-open the project. */
    private async setState(state: QbsSessionState): Promise<void> {
        this.state = state;
        this.stateChanged.fire(this.state);
    }

    private static convert(status: QbsProtocolEngineState): QbsSessionState {
        switch (status) {
            case QbsProtocolEngineState.Started:
                return QbsSessionState.Started;
            case QbsProtocolEngineState.Starting:
                return QbsSessionState.Starting
            case QbsProtocolEngineState.Stopped:
                return QbsSessionState.Stopped
            case QbsProtocolEngineState.Stopping:
                return QbsSessionState.Stopping;
        }
    }

    /** Requests the path to the Qbs executable file stored in the extension  configuration and
     * checks for its presence in the file system. Depending on the result, displays an appropriate
     * message box and then returns the ensuring result. */
    private static async ensureQbsPathIsSet(qbsPath: string): Promise<boolean> {
        if (qbsPath === 'qbs')
            qbsPath = await which(qbsPath);
        if (!qbsPath) {
            await vscode.window.showErrorMessage(localize('qbs.executable.missed.error.message',
                'Qbs executable not set in settings.'));
            return false;
        } else if (!fs.existsSync(qbsPath)) {
            await vscode.window.showErrorMessage(localize('qbs.executable.not-found.error.message',
                `Qbs executable not found.`));
            return false;
        }
        return true;
    }
}
