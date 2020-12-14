import * as vscode from 'vscode';

import {basename} from 'path';

import {QbsProject} from '../qbsproject';
import {QbsSession} from '../qbssession';

export async function displayWorkspaceProjectSelector(session: QbsSession) {
    const projects = await QbsProject.enumerateWorkspaceProjects();
    interface QbsProjectQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
    }

    const items: QbsProjectQuickPickItem[] = projects.map(uri => {
        return {
            label: basename(uri.fsPath),
            uri
        };
    });

    const uri = await vscode.window.showQuickPick(items).then(item => {
        return item?.uri;
    });

    await session.setupProject(uri);
}
