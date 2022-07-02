import { QbsSession } from "../qbssession";

import * as vscode from 'vscode';

export async function getBuildDirectory(session: QbsSession): Promise<string | null> {
    const buildDirectory = session.project()?.data()?.buildDirectory();
    return Promise.resolve(buildDirectory ? buildDirectory : null);
}

export async function getBuildDirectoryUnresolved(session: QbsSession): Promise<string | null> {
    const buildDirectory = session.settings().buildDirectory();
    return Promise.resolve(buildDirectory);
}

export async function getProfileName(session: QbsSession): Promise<string | null> {
    const profileName = session.project()?.buildStep()?.profileName();
    return Promise.resolve(profileName ? profileName : null);
}

export async function getConfigurationName(session: QbsSession): Promise<string | null> {
    const configurationName = session.project()?.buildStep()?.configurationName();
    return Promise.resolve(configurationName ? configurationName : null);
}