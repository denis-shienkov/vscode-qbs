import * as vscode from 'vscode';
import * as cp from 'child_process';

export enum QbsSessionProtocolStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

const PACKET_PREAMBLE = "qbsmsg:";

export class QbsSessionProtocol implements vscode.Disposable {
    private _input: string = '';
    private _expectedLength: number = -1;
    private _status: QbsSessionProtocolStatus = QbsSessionProtocolStatus.Stopped;
    private _process: cp.ChildProcess | undefined;
    private _onStatusChanged: vscode.EventEmitter<QbsSessionProtocolStatus> = new vscode.EventEmitter<QbsSessionProtocolStatus>();
    private _onResponseReceived: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

    readonly onStatusChanged: vscode.Event<QbsSessionProtocolStatus> = this._onStatusChanged.event;
    readonly onResponseReceived: vscode.Event<any> = this._onResponseReceived.event;

    constructor() {
    }

    dispose() {  }

    set status(st: QbsSessionProtocolStatus) {
        if (st === this._status)
            return;
        this._status = st;
        this._onStatusChanged.fire(this._status);
    }

    get status(): QbsSessionProtocolStatus {
        return this._status;
    }

    async start(qbsPath: string) {
        this._input = '';
        this._expectedLength = -1;
        this.status = QbsSessionProtocolStatus.Starting;
        this._process = cp.spawn(qbsPath, ['session']);

        this._process.stdout?.on('data', (data) => {
            this.status = QbsSessionProtocolStatus.Started;
            this._input += data;
            this.parseStdOutput();
        });
        
        this._process.stderr?.on('data', (data) => {
            // TODO: Implement me.
        });
          
        this._process.on('close', (code) => {
            // TODO: Implement me.
            this.status = QbsSessionProtocolStatus.Stopped;
        });
    }

    async stop() {
        this.status = QbsSessionProtocolStatus.Stopping;
        this._process?.kill();
    }

    async sendRequest(request: any) {
        const json = JSON.stringify(request);
        const data = Buffer.from(json, 'binary').toString('base64');
        const output = PACKET_PREAMBLE + data.length + '\n' + data;
        this._process?.stdin?.write(output);
    }

    private parseStdOutput() {
        for (;;) {
            if (this._expectedLength === -1) {
                const preambleIndex = this._input.indexOf(PACKET_PREAMBLE);
                if (preambleIndex === -1)
                    break;
                const numberOffset = preambleIndex + PACKET_PREAMBLE.length;
                const newLineOffset = this._input.indexOf('\n', numberOffset);
                if (newLineOffset === -1)
                    return;
                const sizeString = this._input.substring(numberOffset, newLineOffset);
                const length = parseInt(sizeString);
                if (isNaN(length) || length < 0) {
                    // TODO: Implement me.
                } else {
                    this._expectedLength = length;
                }
                this._input = this._input.substring(newLineOffset + 1);
            } else {
                if (this._input.length < this._expectedLength)
                    break;
                const data = this._input.substring(0, this._expectedLength);
                this._input = this._input.slice(this._expectedLength);
                this._expectedLength = -1;
                const json = Buffer.from(data, 'base64').toString('binary');
                const response = JSON.parse(json);
                this._onResponseReceived.fire(response);
            }
        }
    }
}
