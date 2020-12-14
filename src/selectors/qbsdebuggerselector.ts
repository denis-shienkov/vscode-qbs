import * as vscode from 'vscode';

import {QbsDebuggerData} from '../datatypes/qbsdebuggerdata';
import {QbsSession} from '../qbssession';

export async function displayDebuggerSelector(session: QbsSession) {
    const dbgs = (await session.settings().enumerateDebuggers()) || [];
    interface QbsDebuggerQuickPickItem extends vscode.QuickPickItem {
        dbg: QbsDebuggerData;
    }

    const items: QbsDebuggerQuickPickItem[] = dbgs.map(dbg => {
    return {
        label: dbg.name(),
        dbg
    };
    });

    const selectedDbg = await vscode.window.showQuickPick(items).then(item => {
        return item?.dbg;
    });

    session.project()?.runStep().setup(undefined, selectedDbg);
}
