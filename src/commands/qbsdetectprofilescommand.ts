import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function onDetectProfiles(session: QbsSession) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('qbs.detect.profiles.progress.title', 'Detecting profiles...')
    }, async (p) => {
        const success = await session.settings().detectProfiles();
        return new Promise<void>(resolve => {
            p.report({
                increment: success ? 100 : 0,
                message: success ? localize('qbs.detect.profiles.progress.completed.message', 'Completed')
                                 : localize('qbs.detect.profiles.progress.failed.message', 'Failed')
            });

            setTimeout(() => {
                resolve();
            }, 3000);
        });
    });
}
