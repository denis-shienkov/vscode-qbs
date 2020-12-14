import {QbsSession} from '../qbssession';

export async function onStopSession(session: QbsSession) {
    await session.stop();
}
