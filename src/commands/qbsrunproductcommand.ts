import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as path from 'path';

import * as QbsUtils from '../qbsutils';
import * as QbsCommand from '../commands/qbsbuildcommand';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const DEFAULT_COMMAND_TIMEOUT_MS = 1000;

export async function onRunProduct(session: QbsSession) {
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

    const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
    for (const terminal of terminals) {
        if (terminal.name === 'QBS Run') {
            terminal.dispose();
        }
    }

    const dbg = session.project()?.runStep().debugger();
    if (!dbg?.hasProgram()) {
        vscode.window.showErrorMessage(localize('qbs.product.exe.missed.error.message',
                                                'Product executable missing, please re-build the product.'));
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
