import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as path from 'path';

import * as QbsUtils from '../qbsutils';

import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onRunProduct(session: QbsSession) {
    const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
    for (const terminal of terminals) {
        if (terminal.name === 'QBS Run') {
            terminal.dispose();
        }
    }

    const dbg = session.project()?.runStep().debugger();
    if (!dbg?.hasProgram()) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Target executable missing, please re-build the product.'));
        return;
    }

    const escaped = QbsUtils.escapeShell(dbg.program());
    const program = dbg.program();
    const env = dbg.environmentData().data();
    const terminal = vscode.window.createTerminal({
        name: 'QBS Run',
        env,
        cwd: path.dirname(program)
    });
    if (process.platform === 'darwin') {
        // workaround for macOS system integrity protection
        const specialEnvs: string[] = ['DYLD_LIBRARY_PATH', 'DYLD_FRAMEWORK_PATH'];
        for (const specialEnv of specialEnvs) {
            if (env[specialEnv]) {
                terminal.sendText(`export ${specialEnv}=${QbsUtils.escapeShell(env[specialEnv])}`);
            }
        }
    }
    terminal.sendText(escaped);
    terminal.show();
}
