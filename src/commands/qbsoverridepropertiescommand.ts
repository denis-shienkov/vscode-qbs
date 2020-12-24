import * as vscode from 'vscode';

import * as QbsUtils from '../qbsutils';

import {QbsSession} from '../qbssession';

export async function onOverrideProperties(session: QbsSession) {
    // Create and show the `overridden-properties.json` file.
    const filePath = session.settings().overriddenPropertiesPath();
    QbsUtils.ensureFileCreated(filePath);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc);
}
