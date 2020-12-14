import * as vscode from 'vscode';

import {QbsCommandKey} from './qbscommandkey';
import {QbsSessionStatus} from '../qbssession';
import {QbsSession} from '../qbssession';

export async function onAutoRestartSession(session: QbsSession) {
    await new Promise<void>(resolve => {
        if (!session.settings().ensureQbsExecutableConfigured()) {
            vscode.commands.executeCommand(QbsCommandKey.StopSession);
            resolve();
        }

        let autoRestartRequired: boolean = false;
        const statusChangedSubscription = session.onStatusChanged(async (sessionStatus) => {
            if (sessionStatus === QbsSessionStatus.Stopped) {
                if (autoRestartRequired) {
                    autoRestartRequired = false;
                    await vscode.commands.executeCommand(QbsCommandKey.StartSession);
                    await statusChangedSubscription.dispose();
                    resolve();
                }
            }
        });

        const sessionStatus = session.status();
        if (sessionStatus === QbsSessionStatus.Started || sessionStatus === QbsSessionStatus.Starting) {
            autoRestartRequired = true;
            vscode.commands.executeCommand(QbsCommandKey.StopSession);
            statusChangedSubscription.dispose();
            resolve();
        } else if (sessionStatus === QbsSessionStatus.Stopping) {
            autoRestartRequired = true;
        } else if (sessionStatus === QbsSessionStatus.Stopped) {
            vscode.commands.executeCommand(QbsCommandKey.StartSession);
            statusChangedSubscription.dispose();
            resolve();
        }
    });
}
