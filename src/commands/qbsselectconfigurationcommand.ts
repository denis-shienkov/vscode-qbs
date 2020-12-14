import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectConfiguration(session: QbsSession) {
    await QbsSelectors.displayConfigurationSelector(session);
}
