import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsProfileData} from '../datatypes/qbsprofiledata';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function displayProfileSelector(session: QbsSession) {
    const profiles = await session.settings().enumerateProfiles();
    interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
        profile: QbsProfileData;
    }

    const items: QbsProfileQuickPickItem[] = profiles.map(profile => {
        const qbs = profile.qbs();
        const architecture = qbs.architecture();
        const type = qbs.toolchainType();
        const description = localize('qbs.profile.description.begin', 'Detected architecture ') + '"'
            + architecture + '", ' + localize('qbs.profile.description.end', 'type ') + '"' + type + '"';
        return {
            label: profile.name(),
            description,
            profile
        };
    });

    const selectedProfile = await vscode.window.showQuickPick(items).then(item => {
        return item?.profile;
    });

    session.project()?.buildStep().setup(selectedProfile, undefined, undefined);
}
