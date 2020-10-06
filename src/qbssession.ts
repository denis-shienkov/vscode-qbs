import * as vscode from 'vscode';

import {QbsProcess, QbsProcessStatus} from './qbsprocess';

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
    
    // Public events.
    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;
    readonly onProfileNameChanged: vscode.Event<string> = this._onProfileNameChanged.event;
    readonly onConfigurationNameChanged: vscode.Event<string> = this._onConfigurationNameChanged.event;

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

    // Private methods.

    handleIncomingObject(object: any) {
        const type = object['type'];
        console.debug(`t: ${type}`);

        if (type === 'hello') {
            // TODO: ??
        } else if (type === 'project-resolved') {
            this.setProjectData(object, true);
            //const auto errors = extractErrorDetails(payload);
            //emit projectResolved(errors);
        } else if (type === 'project-built') {
            this.setProjectData(object, false);
            //const auto errors = extractErrorDetails(payload);
            //emit projectBuilt(errors);
        } else if (type === 'project-cleaned') {
            //const auto errors = extractErrorDetails(payload);
            //emit projectCleaned(errors);
        } else if (type === 'install-done') {
            //const auto errors = extractErrorDetails(payload);
            //emit projectInstalled(errors);
        } else if (type === 'log-data') {
            //const auto message = payload.value("message").toString();
            //qCInfo(SESSION) << "Qbs message: " + message;
        } else if (type === 'warning') {
            //const SessionErrorDetails warning(payload.value("warning").toObject());
            //qCWarning(SESSION) << "Qbs warning: " + warning.toString();
        } else if (type === 'task-started') {
            //const auto description = payload.value("description").toString();
            //const auto maxProgress = payload.value("max-progress").toInt();
            //emit taskStarted(description, maxProgress);
        } else if (type === 'task-progress') {
            //const auto progress = payload.value("progress").toInt();
            //emit taskProgress(progress);
        } else if (type === 'new-max-progress') {
            //const auto maxProgress = payload.value("max-progress").toInt();
            //emit taskMaxProgressChanged(maxProgress);
        } else if (type === 'generated-files-for-source') {
            // TODO: Implement me.
        } else if (type === 'command-description') {
            //const auto description = payload.value("message").toString();
            //emit commandDescriptionReceived(description);
        } else if (type === 'files-added' || type === 'files-removed') {
            // TODO: Implement me.
        } else if (type === 'process-result') {
            //const auto executable = payload.value("executable-file-path").toString();
            //const auto args = arrayToStringList(payload.value("arguments"));
            //const auto workingDir = payload.value("working-directory").toString();
            //const auto stdOut = arrayToStringList(payload.value("stdout"));
            //const auto stdErr = arrayToStringList(payload.value("stderr"));
            //const auto success = payload.value("success").toBool();
            //emit processResultReceived(executable, args, workingDir, stdOut, stdErr, success);
        } else if (type === 'run-environment') {
            // TODO: Implement me.
        }
    }

    setProjectData(object: any, withBuildSystemFiles: boolean) {
        const data = object['project-data'];
        if (data) {
            const files = data['build-system-files'];
            this._projectData = data;
            if (!withBuildSystemFiles)
                this._projectData['build-system-files'] = files;
        }
    }
}
