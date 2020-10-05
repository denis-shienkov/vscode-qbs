import * as vscode from 'vscode';

export class QbsSession implements vscode.Disposable {
    // Private members.
    private _projectUri!: vscode.Uri; // Current project *.qbs file.
    private _onProjectUriChanged: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    
    // Public events.
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;

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

    set projectUri(uri: vscode.Uri) {
        if (uri === this._projectUri)
            return;
        this._projectUri = uri;
        this._onProjectUriChanged.fire(this._projectUri);
    }

    get projectUri(): vscode.Uri {
        return this._projectUri;
    }

    // Private methods.
}
