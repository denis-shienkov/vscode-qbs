import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as path from 'path';

import * as QbsUtils from '../qbsutils';
import * as QbsCommand from '../commands/qbsbuildcommand';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsGetRunEnvironmentRequest} from '../datatypes/qbsgetrunenvironmentrequest';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const DEFAULT_COMMAND_TIMEOUT_MS = 1000;

export async function onRunProduct(session: QbsSession, productName?: string) {
    productName = await ensureProductReadyToRun(session, productName);
    if (!productName)
        return;

    const project = session.project();
    if (!project)
        return;
    const product = project?.productAt(productName);
    if (!product) {
        vscode.window.showErrorMessage(localize('qbs.product.missed.error.message',
                                                'Product not found, please re-configure the project.'));
        return;
    } else if (!product.isRunnable()) {
        vscode.window.showErrorMessage(localize('qbs.product.notexecutable.error.message',
                                                'Product is not runnable, please re-configure the project.'));
        return;
    } else if (!product.targetExecutable()) {
        vscode.window.showErrorMessage(localize('qbs.product.executable.missed.error.message',
                                                'Product executable missing, please re-build the product.'));
        return;
    }

    const terminals = <vscode.Terminal[]>(<any>vscode.window).terminals;
    for (const terminal of terminals) {
        if (terminal.name === 'QBS Run') {
            terminal.dispose();
        }
    }

    const env = await fetchProductRunEnv(session, productName);
    const terminal = vscode.window.createTerminal({
        name: 'QBS Run',
        env,
        cwd: product.buildDirectory()
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
    const program = QbsUtils.escapeShell(product.targetExecutable());
    terminal.sendText(program);
    terminal.show();
}

async function buildProduct(session: QbsSession, productName?: string) : Promise<boolean> {
    if (!productName)
        return false;
    const buildRequest = new QbsBuildRequest(session.settings());
    buildRequest.setProducts([ productName ]);
    return await QbsCommand.onBuild(session, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
}

async function ensureProductReadyToRun(session: QbsSession, productName?: string) : Promise<string|undefined> {
    if (QbsUtils.isEmpty(productName)) {
        productName = session.project()?.buildStep().productName();
        if (QbsUtils.isEmpty(productName)) {
            vscode.window.showErrorMessage(localize('qbs.product.name.missed.error.message',
                                                    'Product name missing, please re-configure the product.'));
            return undefined;
        }
    }
    if (session.settings().buildBeforeRun()) {
        if (!await buildProduct(session, productName))
            return undefined;
    }
    return productName;
}

async function fetchProductRunEnv(session: QbsSession, productName: string) : Promise<any> {
    return new Promise<any>(resolve => {
        const subscription = session.onRunEnvironmentReceived(async (data) => {
            await subscription.dispose();
            const env = Object.entries(data.data()).map(function([k, v]) {
                return {
                    name: k,
                    value: v
                };
            });
            resolve(env);
        });
        const request = new QbsGetRunEnvironmentRequest(session.settings());
        request.setProduct(productName);
        session.getRunEnvironment(request);
    });
}
