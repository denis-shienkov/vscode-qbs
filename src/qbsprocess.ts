import * as vscode from 'vscode';
import * as cp from 'child_process';

export enum QbsProcessStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

export class QbsProcess implements vscode.Disposable {
    // Private members.
    private _status: QbsProcessStatus = QbsProcessStatus.Stopped;
    private _process: cp.ChildProcess | undefined;
    private _onStatusChanged: vscode.EventEmitter<QbsProcessStatus> = new vscode.EventEmitter<QbsProcessStatus>();

     // Public events.
     readonly onStatusChanged: vscode.Event<QbsProcessStatus> = this._onStatusChanged.event;

    // Constructors.

    constructor(readonly extensionContext: vscode.ExtensionContext) {
    }

    // Public overriden methods.

    dispose() {  }

    // Public methods.

    set status(st: QbsProcessStatus) {
        if (st === this._status)
            return;
        this._status = st;
        this._onStatusChanged.fire(this._status);
    }

    get status(): QbsProcessStatus {
        return this._status;
    }

    async start(qbsPath: string) {
        this.status = QbsProcessStatus.Starting;
        this._process = cp.spawn(qbsPath, ['session']);

        this._process.stdout?.on('data', (data) => {
            this.status = QbsProcessStatus.Started;
            console.log(`stdout: ${data}`);
        });
        
        this._process.stderr?.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
          
        this._process.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            this.status = QbsProcessStatus.Stopped;
        });
    }

    async stop() {
        this.status = QbsProcessStatus.Stopping;
        this._process?.kill();
    }
}
