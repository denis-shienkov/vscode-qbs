import * as vscode from 'vscode';
import * as cp from 'child_process';

import {QbsRequest} from './qbstypes';

export enum QbsSessionProtocolStatus {
    Stopped,
    Started,
    Stopping,
    Starting
}

const PACKET_PREAMBLE = 'qbsmsg:';

export class QbsSessionProtocol implements vscode.Disposable {
    private _input: string = '';
    private _expectedLength: number = -1;
    private _status: QbsSessionProtocolStatus = QbsSessionProtocolStatus.Stopped;
    private _process?: cp.ChildProcess;
    private _onStatusChanged: vscode.EventEmitter<QbsSessionProtocolStatus> = new vscode.EventEmitter<QbsSessionProtocolStatus>();
    private _onResponseReceived: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

    readonly onStatusChanged: vscode.Event<QbsSessionProtocolStatus> = this._onStatusChanged.event;
    readonly onResponseReceived: vscode.Event<any> = this._onResponseReceived.event;

    constructor() {}

    dispose() {}

    status(): QbsSessionProtocolStatus { return this._status; }

    async start(qbsPath: string) {
        this._input = '';
        this._expectedLength = -1;
        await this.setStatus(QbsSessionProtocolStatus.Starting);
        this._process = cp.spawn(qbsPath, ['session']);

        this._process.stdout?.on('data', async (data) => {
            await  this.setStatus(QbsSessionProtocolStatus.Started);
            this._input += data;
            await this.parseStdOutput();
        });

        this._process.stderr?.on('data', async (data) => {
            // TODO: Implement me.
        });

        this._process.on('close', async (code) => {
            // TODO: Implement me.
            await this.setStatus(QbsSessionProtocolStatus.Stopped);
        });
    }

    async stop() {
        await this.setStatus(QbsSessionProtocolStatus.Stopping);
        this._process?.kill();
    }

    async sendRequest(request: QbsRequest) {
        const json = JSON.stringify(request.data());
        const data = Buffer.from(json, 'binary').toString('base64');
        const output = PACKET_PREAMBLE + data.length + '\n' + data;
        this._process?.stdin?.write(output);
    }

    private async setStatus(status: QbsSessionProtocolStatus) {
        if (status === this._status)
            return;
        this._status = status;
        this._onStatusChanged.fire(this._status);
    }

    private async parseStdOutput() {
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
