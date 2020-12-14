import {QbsSession} from '../qbssession';

export async function onRestoreProject(session: QbsSession) {
    await session.restoreProject();
}
