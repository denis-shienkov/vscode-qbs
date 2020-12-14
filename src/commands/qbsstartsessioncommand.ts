import {QbsSession} from '../qbssession';

export async function onStartSession(session: QbsSession) {
    await session.start();
}
