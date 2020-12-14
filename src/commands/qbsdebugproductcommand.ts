import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onDebugProduct(session: QbsSession) {
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
