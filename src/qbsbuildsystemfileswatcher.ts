import * as vscode from 'vscode';
import * as chokidar from 'chokidar';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';
import {QbsProjectData} from './datatypes/qbsprojectdata';

const AUTO_RESOLVE_DELAY = 1000; // in milliseconds

export class QbsBuildSystemFilesWatcher implements vscode.Disposable {
    private _watcher?: chokidar.FSWatcher;

    constructor(session: QbsSession, data: QbsProjectData) {
        const buildDirectory = data.buildDirectory();
        const files =  data.buildSystemFiles().filter(file => !QbsUtils.isChildOf(file, buildDirectory));
        if (files) {
            this._watcher = chokidar.watch(files, {ignoreInitial: true});
            this._watcher.on('change', () => {
                if (session.settings().autoResolve())
                    session.autoResolve(AUTO_RESOLVE_DELAY);
            });
        }
    }

    dispose() {
        this._watcher?.close();
    }
}
