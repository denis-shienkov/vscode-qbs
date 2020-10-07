import * as vscode from 'vscode';

import {QbsProcess, QbsProcessStatus} from './qbsprocess';

import {QbsSessionProcessResult,
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
    // Private members.
    private _process: QbsProcess | undefined;
    private _status: QbsSessionStatus = QbsSessionStatus.Stopped;
    private _projectUri!: vscode.Uri; // Current project *.qbs file.
    private _profileName!: string;
    private _configurationName!: string;
    private _projectData!: any;
    private _onStatusChanged: vscode.EventEmitter<QbsSessionStatus> = new vscode.EventEmitter<QbsSessionStatus>();
    private _onProjectUriChanged: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    private _onProfileNameChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    private _onConfigurationNameChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    private _onHelloReceived: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _onProjectResolved: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _onProjectBuilt: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _onProjectCleaned: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _onProjectInstalled: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _onLogMessageReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onTaskStarted: vscode.EventEmitter<QbsSessionTaskStartedResult> = new vscode.EventEmitter<QbsSessionTaskStartedResult>();
    private _onTaskProgressUpdated: vscode.EventEmitter<QbsSessionTaskProgressResult> = new vscode.EventEmitter<QbsSessionTaskProgressResult>();
    private _onTaskMaxProgressChanged: vscode.EventEmitter<QbsSessionTaskMaxProgressResult> = new vscode.EventEmitter<QbsSessionTaskMaxProgressResult>();
    private _onCommandDescriptionReceived: vscode.EventEmitter<QbsSessionMessageResult> = new vscode.EventEmitter<QbsSessionMessageResult>();
    private _onProcessResultReceived: vscode.EventEmitter<QbsSessionProcessResult> = new vscode.EventEmitter<QbsSessionProcessResult>();
    
    // Public events.
    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;
    readonly onProfileNameChanged: vscode.Event<string> = this._onProfileNameChanged.event;
    readonly onConfigurationNameChanged: vscode.Event<string> = this._onConfigurationNameChanged.event;
    readonly onHelloReceived: vscode.Event<void> = this._onHelloReceived.event;
    readonly onProjectResolved: vscode.Event<any> = this._onProjectResolved.event;
    readonly onProjectBuilt: vscode.Event<any> = this._onProjectBuilt.event;
    readonly onProjectCleaned: vscode.Event<any> = this._onProjectCleaned.event;
    readonly onProjectInstalled: vscode.Event<any> = this._onProjectInstalled.event;
    readonly onLogMessageReceived: vscode.Event<QbsSessionMessageResult> = this._onLogMessageReceived.event;
    readonly onTaskStarted: vscode.Event<QbsSessionTaskStartedResult> = this._onTaskStarted.event;
    readonly onTaskProgressUpdated: vscode.Event<QbsSessionTaskProgressResult> = this._onTaskProgressUpdated.event;
    readonly onTaskMaxProgressChanged: vscode.Event<QbsSessionTaskMaxProgressResult> = this._onTaskMaxProgressChanged.event;
    readonly onCommandDescriptionReceived: vscode.Event<QbsSessionMessageResult> = this._onCommandDescriptionReceived.event;
    readonly onProcessResultReceived: vscode.Event<QbsSessionProcessResult> = this._onProcessResultReceived.event;

    // Constructors.

    constructor(readonly extensionContext: vscode.ExtensionContext) {
        this._process = new QbsProcess(extensionContext);

        this._process.onStatusChanged(status => {
            switch (status) {
            case QbsProcessStatus.Started:
                this.status = QbsSessionStatus.Started;
                break;
            case QbsProcessStatus.Starting:
                this.status = QbsSessionStatus.Starting;
                break;
            case QbsProcessStatus.Stopped:
                this.status = QbsSessionStatus.Stopped;
                break;
            case QbsProcessStatus.Stopping:
                this.status = QbsSessionStatus.Stopping;
                break;
            }
        });

        this._process.onObjectReceived(object => {
            this.handleIncomingObject(object);
        });
    }

    // Public static methods.

    static create(extensionContext: vscode.ExtensionContext) {
        const session = new QbsSession(extensionContext);
        return session;
    }

    // Public overriden methods.

    dispose() {  }

    // Public methods.

    async start() {
        const qbsPath = <string>vscode.workspace.getConfiguration('qbs').get('qbsPath');
        await this._process?.start(qbsPath);
    }

    async stop() {
        await this._process?.stop();
    }

    set status(st: QbsSessionStatus) {
        if (st === this._status)
            return;
        this._status = st;
        this._onStatusChanged.fire(this._status);
    }

    get status(): QbsSessionStatus {
        return this._status;
    }

    set projectUri(uri: vscode.Uri) {
        if (uri === this._projectUri)
            return;
        this._projectUri = uri;
        this._onProjectUriChanged.fire(this._projectUri);
    }

    get projectUri(): vscode.Uri {
        return this._projectUri;
    }

    set profileName(name: string) {
        if (name === this._profileName)
            return;
        this._profileName = name;
        this._onProfileNameChanged.fire(this._profileName);
    }

    get profileName(): string {
        return this._profileName;
    }

    set configurationName(name: string) {
        if (name === this._configurationName)
            return;
        this._configurationName = name;
        this._onConfigurationNameChanged.fire(this._configurationName);
    }

    get configurationName(): string {
        return this._configurationName;
    }

    // Private static methods.
    static extractErrorDetails(object: any) : any {
        return object['error'];
    }

    // Private methods.

    private handleIncomingObject(object: any) {
        const type = object['type'];
        console.debug(`t: ${type}`);

        if (type === 'hello') {
            this._onHelloReceived.fire();
        } else if (type === 'project-resolved') {
            this.setProjectData(object, true);
            const errors = QbsSession.extractErrorDetails(object);
            this._onProjectResolved.fire(errors);
        } else if (type === 'project-built') {
            this.setProjectData(object, false);
            const errors = QbsSession.extractErrorDetails(object);
            this._onProjectBuilt.fire(errors);
        } else if (type === 'project-cleaned') {
            const errors = QbsSession.extractErrorDetails(object);
            this._onProjectCleaned.fire(errors);
        } else if (type === 'install-done') {
            const errors = QbsSession.extractErrorDetails(object);
            this._onProjectInstalled.fire(errors);
        } else if (type === 'log-data') {
            const result = new QbsSessionMessageResult(object);
            this._onLogMessageReceived.fire(result);
        } else if (type === 'warning') {
            // TODO:
            //const SessionErrorDetails warning(payload.value("warning").toObject());
            //qCWarning(SESSION) << "Qbs warning: " + warning.toString();
        } else if (type === 'task-started') {
            const result = new QbsSessionTaskStartedResult(object);
            this._onTaskStarted.fire(result);
        } else if (type === 'task-progress') {
            const result = new QbsSessionTaskProgressResult(object);
            this._onTaskProgressUpdated.fire(result);
        } else if (type === 'new-max-progress') {
            const result = new QbsSessionTaskMaxProgressResult(object);
            this._onTaskMaxProgressChanged.fire(result);
        } else if (type === 'generated-files-for-source') {
            // TODO: Implement me.
        } else if (type === 'command-description') {
            const result = new QbsSessionMessageResult(object);
            this._onCommandDescriptionReceived.fire(result);
        } else if (type === 'files-added' || type === 'files-removed') {
            // TODO: Implement me.
        } else if (type === 'process-result') {
            const result = new QbsSessionProcessResult(object);
            this._onProcessResultReceived.fire(result);
        } else if (type === 'run-environment') {
            // TODO: Implement me.
        }
    }

    private setProjectData(object: any, withBuildSystemFiles: boolean) {
        const data = object['project-data'];
        if (data) {
            const files = data['build-system-files'];
            this._projectData = data;
            if (!withBuildSystemFiles)
                this._projectData['build-system-files'] = files;
        }
    }
}
