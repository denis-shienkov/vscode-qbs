import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from '../qbssession';
import {QbsCommandKey} from './qbscommandkey';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onDebugProduct(session: QbsSession) {
    if (session.settings().buildBeforeRun()) {
        let success = await vscode.commands.executeCommand<boolean>(QbsCommandKey.Build);
        if (!success)
            return;
    }

    const dbg = session.project()?.runStep().debugger();
    if (!dbg) {
        vscode.window.showErrorMessage(localize('qbs.product.debugger.missed.error.message',
                                                'Debugger missing, please select the debugger.'));
        return;
    } else if (!dbg.hasProgram()) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Target executable missing, please re-build the product.'));
        return;
    }

    await vscode.debug.startDebugging(undefined, dbg.data());
}
