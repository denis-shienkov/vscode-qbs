import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import * as QbsCommand from '../commands/qbsbuildcommand';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const DEFAULT_COMMAND_TIMEOUT_MS = 1000;

export async function onDebugProduct(session: QbsSession) {
    if (session.settings().buildBeforeRun()) {
        const productName = session.project()?.buildStep().productName();
        if (!productName) {
            vscode.window.showErrorMessage(localize('qbs.product.name.missed.error.message',
                                                    'Product name missing, please re-configure the product.'));
            return;
        }
        const buildRequest = new QbsBuildRequest(session.settings());
        buildRequest.setProducts([ productName ]);
        await QbsCommand.onBuild(session, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }

    const dbg = session.project()?.runStep().debugger();
    if (!dbg) {
        vscode.window.showErrorMessage(localize('qbs.product.debugger.missed.error.message',
                                                'Debugger missing, please select the debugger.'));
        return;
    } else if (!dbg.hasProgram()) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Product executable missing, please re-build the product.'));
        return;
    }

    await vscode.debug.startDebugging(undefined, dbg.data());
}
