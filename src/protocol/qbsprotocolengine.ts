import * as cp from 'child_process';
import * as vscode from 'vscode';

import { QbsProtocolRequest } from './qbsprotocolrequest';

export enum QbsProtocolEngineState { Started, Starting, Stopped, Stopping }

export class QbsProtocolEngine implements vscode.Disposable {
    private input: string = '';
    private expectedLength: number = -1;
    private state: QbsProtocolEngineState = QbsProtocolEngineState.Stopped;
    private process?: cp.ChildProcess;

    private readonly stateChanged: vscode.EventEmitter<QbsProtocolEngineState> = new vscode.EventEmitter<QbsProtocolEngineState>();
    private readonly responseReceived: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();

    public readonly onStateChanged: vscode.Event<QbsProtocolEngineState> = this.stateChanged.event;
    public readonly onResponseReceived: vscode.Event<any> = this.responseReceived.event;

    private readonly PACKET_PREAMBLE = 'qbsmsg:';

    public constructor() { }

    public dispose() { }

    public getState(): QbsProtocolEngineState { return this.state; }

    public async start(qbsPath: string) {
        this.input = '';
        this.expectedLength = -1;
        await this.setState(QbsProtocolEngineState.Starting);
        this.process = cp.spawn(qbsPath, ['session']);

        this.process.stdout?.on('data', async (data) => {
            await this.setState(QbsProtocolEngineState.Started);
            this.input += data;
            await this.parseStdOutput();
        });

        this.process.stderr?.on('data', async (data) => {
            // TODO: Implement me.
        });

        this.process.on('close', async (code) => {
            // TODO: Implement me.
            await this.setState(QbsProtocolEngineState.Stopped);
        });
    }

    public async stop() {
        await this.setState(QbsProtocolEngineState.Stopping);
        this.process?.kill();
    }

    public async sendRequest(request: QbsProtocolRequest) {
        const json = JSON.stringify(request.getData());
        const data = Buffer.from(json, 'utf8').toString('base64');
        const output = this.PACKET_PREAMBLE + data.length + '\n' + data;
        this.process?.stdin?.write(output);
    }

    private async setState(state: QbsProtocolEngineState) {
        if (state === this.state)
            return;
        this.state = state;
        this.stateChanged.fire(this.state);
    }

    private async parseStdOutput() {
        for (; ;) {
            if (this.expectedLength === -1) {
                const preambleIndex = this.input.indexOf(this.PACKET_PREAMBLE);
                if (preambleIndex === -1)
                    break;
                const numberOffset = preambleIndex + this.PACKET_PREAMBLE.length;
                const newLineOffset = this.input.indexOf('\n', numberOffset);
                if (newLineOffset === -1)
                    return;
                const sizeString = this.input.substring(numberOffset, newLineOffset);
                const length = parseInt(sizeString);
                if (isNaN(length) || length < 0) {
                    // TODO: Implement me.
                } else {
                    this.expectedLength = length;
                }
                this.input = this.input.substring(newLineOffset + 1);
            } else {
                if (this.input.length < this.expectedLength)
                    break;
                const data = this.input.substring(0, this.expectedLength);
                this.input = this.input.slice(this.expectedLength);
                this.expectedLength = -1;
                const json = Buffer.from(data, 'base64').toString('utf8');
                const response = JSON.parse(json);
                this.responseReceived.fire(response);
            }
        }
    }
}
