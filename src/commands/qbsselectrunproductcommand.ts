import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectRunProduct(session: QbsSession) {
    await QbsSelectors.displayRunProductSelector(session);
}
