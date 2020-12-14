import * as QbsSelectors from '../selectors/qbsselectors';

import {QbsSession} from '../qbssession';

export async function onSelectProject(session: QbsSession) {
    await QbsSelectors.displayWorkspaceProjectSelector(session);
}
