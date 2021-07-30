import * as vscode from 'vscode';

import * as QbsUtils from '../qbsutils';

import {QbsSession} from '../qbssession';

export async function onEditConfigurationCommand(session: QbsSession) {
    // Create and show the `configurations.json` file.
    const filePath = session.settings().configurationsFilePath();
    QbsUtils.ensureFileCreated(filePath, QbsUtils.writeDefaultConfigurations);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc);
}
