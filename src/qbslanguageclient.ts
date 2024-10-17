import * as vscode from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    MessageTransports,
} from 'vscode-languageclient/node';

import { createServerPipeTransport } from 'vscode-languageserver-protocol/node';

export class QbsLanguageClient implements vscode.Disposable {
    private languageClient?: LanguageClient;

    public constructor(pipeName: string) {
        const serverOptions = this.createMessageTransports(pipeName);
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ language: 'qbs' }],
        };
        console.info('Starting Qbs language client on pipe: ' + pipeName);
        this.languageClient = new LanguageClient('Qbs', (async () => serverOptions), clientOptions, true);
        this.languageClient
            .start()
            .then(async () => {
                console.info('Qbs language client started on pipe: ' + pipeName);
            })
            .catch((reason) => {
                void vscode.window.showErrorMessage('Cannot start Qbs language server');
                console.error('Unable to start Qbs language client on pipe: ' + pipeName + ', ' + reason);
            });

    }

    public dispose(): void { this.languageClient?.dispose(); }

    private async createMessageTransports(pipeName: string): Promise<MessageTransports> {
        return new Promise<MessageTransports>(async (resolve) => {
            const transport = createServerPipeTransport(pipeName);
            resolve({ reader: transport[0], writer: transport[1] });
        });
    }
}
