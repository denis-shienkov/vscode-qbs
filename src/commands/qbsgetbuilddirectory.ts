import { QbsSession } from "../qbssession";

import * as vscode from 'vscode';

export async function getBuildDirectory(session: QbsSession): Promise<string | null> {
    const buildDirectory = session.project()?.data()?.buildDirectory();
    return Promise.resolve(buildDirectory ? buildDirectory : null);
}
