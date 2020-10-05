import * as vscode from 'vscode';

export class QbsSession implements vscode.Disposable {
    // Private members.
    private _allProjectUris: vscode.Uri[] = []; // All *.qbs files in opened directory.
    private _projectUri!: vscode.Uri; // Current project *.qbs file.
    private _onProjectUrisEnumerated: vscode.EventEmitter<vscode.Uri[]> = new vscode.EventEmitter<vscode.Uri[]>();
    private _onProjectUriChanged: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    
    // Public events.
    readonly onProjectUrisEnumerated: vscode.Event<vscode.Uri[]> = this._onProjectUrisEnumerated.event; 
    readonly onProjectUriChanged: vscode.Event<vscode.Uri> = this._onProjectUriChanged.event;

    // Constructors.

    constructor(readonly extensionContext: vscode.ExtensionContext) {
    }

    // Public static methods.

    static create(extensionContext: vscode.ExtensionContext) {
        const session = new QbsSession(extensionContext);
        session.initialize();
        return session;
    }

    // Public overriden methods.

    dispose() {  }

    // Public methods.

    get allProjectUris(): vscode.Uri[] {
        return this._allProjectUris;
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

    // Private methods.

    private async initialize() {
        await this.enumerateAllProjectFiles();
    }

    private async enumerateAllProjectFiles() {
        this._allProjectUris = await vscode.workspace.findFiles('*.qbs');
        this._onProjectUrisEnumerated.fire(this._allProjectUris);
    }
}