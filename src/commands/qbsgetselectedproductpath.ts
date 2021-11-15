import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import { QbsSession } from "../qbssession";

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function getSelectedProductPath(session: QbsSession): Promise<string | null> {
    const dbg = session.project()?.runStep().debugger();
    if (!dbg?.hasProgram()) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
            'Target executable missing, please re-build the product.'));
        return Promise.resolve(null);
    }

    return Promise.resolve(dbg.program());
}
