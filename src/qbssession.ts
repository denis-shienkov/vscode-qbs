import * as vscode from 'vscode';

export enum QbsSessionStatus {
    Stopped,
    Started,
    Stopping,
    Starting
  }

export class QbsSession implements vscode.Disposable {
    // Private members.
    private _status: QbsSessionStatus = QbsSessionStatus.Stopped;
    private _projectUri!: vscode.Uri; // Current project *.qbs file.
    private _profileName!: string;
    private _onStatusChanged: vscode.EventEmitter<QbsSessionStatus> = new vscode.EventEmitter<QbsSessionStatus>();
    private _onProjectUriChanged: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    private _onProfileNameChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    
    // Public events.
    readonly onStatusChanged: vscode.Event<QbsSessionStatus> = this._onStatusChanged.event;
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;
    readonly onProfileNameChanged: vscode.Event<string> = this._onProfileNameChanged.event;

    // Constructors.

    constructor(readonly extensionContext: vscode.ExtensionContext) {
    }

    // Public static methods.

    static create(extensionContext: vscode.ExtensionContext) {
        const session = new QbsSession(extensionContext);
        return session;
    }

    // Public overriden methods.

    dispose() {  }

    // Public methods.

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

    // Private methods.
}
