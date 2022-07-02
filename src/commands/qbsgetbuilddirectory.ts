import { QbsSession } from "../qbssession";

export async function getBuildDirectory(session: QbsSession): Promise<string | null> {
    const buildDirectory = session.project()?.data()?.buildDirectory();
    return Promise.resolve(buildDirectory ? buildDirectory : null);
}

export async function getBuildDirectoryUnresolved(session: QbsSession): Promise<string | null> {
    const buildDirectory = session.settings().buildDirectory();
    return Promise.resolve(buildDirectory);
}