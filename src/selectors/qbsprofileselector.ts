import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsProfileData} from '../datatypes/qbsprofiledata';
import {QbsSession} from '../qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function displayProfileSelector(session: QbsSession) {
    const profiles = await session.settings().enumerateProfiles();
    interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
        profile: QbsProfileData | undefined;
    }

    // First fake profile (only for detect command selection).
    const detect: QbsProfileQuickPickItem[] = [{
        label: localize('qbs.profile.detect.label', '[Detect profiles]'),
        description: localize('qbs.profile.detect.description', 'Detect available profiles'),
        profile: undefined
    }];
    const items: QbsProfileQuickPickItem[] = detect.concat(profiles.map(profile => {
        const qbs = profile.qbs();
        const label = profile.name();
        const arch = qbs.architecture();
        const type = qbs.toolchainType();
        const description = localize('qbs.profile.description.', 'Architecture "{0}", type "{1}"', arch, type);
        return { label, description, profile };
    }));

    const chosen = await vscode.window.showQuickPick(items).then(item => {
        return item;
    });

    if (!chosen) { // Choose was canceled by user.
        return;
    } else if (!chosen.profile) { // Detecting profiles was choosed by user.
        await session.settings().detectProfiles();
    } else { // Other profile was choosed by user.
        await session.project()?.buildStep().setup(chosen.profile, undefined, undefined);
    }
}
