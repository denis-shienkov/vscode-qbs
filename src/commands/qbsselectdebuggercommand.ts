import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectDebugger(session: QbsSession) {
    await QbsSelectors.displayDebuggerSelector(session);
}
