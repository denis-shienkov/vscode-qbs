import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectProfile(session: QbsSession) {
    await QbsSelectors.displayProfileSelector(session);
}
