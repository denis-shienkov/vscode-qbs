import {QbsSession} from '../qbssession';

import {QbsCancelRequest} from '../datatypes/qbscancelrequest';

export async function onCancel(session: QbsSession, request: QbsCancelRequest)  {
    await session.cancel(request);
}
