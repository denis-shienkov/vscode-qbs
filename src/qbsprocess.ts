import * as vscode from 'vscode';
import * as cp from 'child_process';

export enum QbsProcessStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

const PACKET_PREAMBLE = "qbsmsg:";

export class QbsProcess implements vscode.Disposable {
    // Private members.
    private _input: string = '';
    private _expectedLength: number = -1;
    private _status: QbsProcessStatus = QbsProcessStatus.Stopped;
    private _process: cp.ChildProcess | undefined;
    private _onStatusChanged: vscode.EventEmitter<QbsProcessStatus> = new vscode.EventEmitter<QbsProcessStatus>();
    private _onObjectReceived: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

     // Public events.
    readonly onStatusChanged: vscode.Event<QbsProcessStatus> = this._onStatusChanged.event;
    readonly onObjectReceived: vscode.Event<any> = this._onObjectReceived.event;

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
        this._input = '';
        this._expectedLength = -1;
        this.status = QbsProcessStatus.Starting;
        this._process = cp.spawn(qbsPath, ['session']);

        this._process.stdout?.on('data', (data) => {
            this.status = QbsProcessStatus.Started;
            console.log(`stdout: ${data}`);
            this._input += data;
            this.parseStdOutput();
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

    // Private methods.

    parseStdOutput() {
        for (;;) {
            if (this._expectedLength === -1) {
                // Lookup the protocol preamble and detect the expected payload length.
                const preambleIndex = this._input.indexOf(PACKET_PREAMBLE);
                if (preambleIndex === -1)
                    break; // Seems, the received packet is incomplete yet.
                const numberOffset = preambleIndex + PACKET_PREAMBLE.length;
                const newLineOffset = this._input.indexOf('\n', numberOffset);
                if (newLineOffset === -1)
                    return; // Seems, the received packet is incomplete yet.
                const sizeString = this._input.substring(numberOffset, newLineOffset);
                const length = parseInt(sizeString);
                if (isNaN(length) || length < 0) {
                    // The received packet has wrong length field.
                    console.debug('qbs: wrong size string received');
                } else {
                    this._expectedLength = length;
                }
                this._input = this._input.substring(newLineOffset + 1);
            } else {
                // Extract the payload.
                if (this._input.length < this._expectedLength)
                    break; // Seems, the received packet is incomplete yet.
                const data = this._input.substring(0, this._expectedLength);
                this._input = this._input.slice(this._expectedLength);
                this._expectedLength = -1;
                const json = Buffer.from(data, 'base64').toString('binary');
                const obj = JSON.parse(json);
                this._onObjectReceived.fire(obj);
            }
        }
    }
}
