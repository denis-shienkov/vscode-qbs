import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectBuildProduct(session: QbsSession) {
    await QbsSelectors.displayBuildProductSelector(session);
}
