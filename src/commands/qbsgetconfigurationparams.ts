import { QbsSession } from "../qbssession";

export async function getProfileName(session: QbsSession): Promise<string | null> {
    const profileName = session.project()?.buildStep()?.profileName();
    return Promise.resolve(profileName ? profileName : null);
}

export async function getConfigurationName(session: QbsSession): Promise<string | null> {
    const configurationName = session.project()?.buildStep()?.configurationName();
    return Promise.resolve(configurationName ? configurationName : null);
}

export async function getCustomProperty(session: QbsSession, property: string): Promise<string | null> {
    const custom_data = session.project()?.buildStep()?.configurationCustomProperties();
    return Promise.resolve(custom_data ? custom_data[property] || null : null);
}