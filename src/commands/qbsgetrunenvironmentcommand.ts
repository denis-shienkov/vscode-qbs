import {QbsSession} from '../qbssession';

import {QbsGetRunEnvironmentRequest} from '../datatypes/qbsgetrunenvironmentrequest';

export async function onGetRunEnvironment(session: QbsSession, request: QbsGetRunEnvironmentRequest) {
    await session.getRunEnvironment(request);
}
