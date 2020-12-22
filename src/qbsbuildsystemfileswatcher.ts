import * as vscode from 'vscode';
import * as chokidar from 'chokidar';

import * as QbsUtils from './qbsutils';

import {QbsCommandKey} from './commands/qbscommandkey';
import {QbsProjectData} from './datatypes/qbsprojectdata';

const AUTO_RESOLVE_DELAY = 1000; // in milliseconds

export class QbsBuildSystemFilesWatcher implements vscode.Disposable {
    private _watchers: chokidar.FSWatcher[] = [];
    private _timer?: NodeJS.Timeout;

    constructor(data: QbsProjectData) {
        const buildDirectory = data.buildDirectory();
        data.buildSystemFiles().forEach(buildSystemFile => {
            const isChildren = QbsUtils.isChildOf(buildSystemFile, buildDirectory);
            if (isChildren) {
                return;
            } else {
                const watcher = chokidar.watch(buildSystemFile, {ignoreInitial: true});
                watcher.on('change', () => this.autoResolve(AUTO_RESOLVE_DELAY));
                this._watchers.push(watcher);
            }
        });
    }

    dispose() {
        this._watchers.forEach(watcher => watcher.close());
    }

    private autoResolve(interval: number) {
        if (this._timer) {
            clearTimeout(this._timer);
        }
        this._timer = setTimeout(async () => {
            await vscode.commands.executeCommand(QbsCommandKey.Resolve);
            this._timer = undefined;
        }, interval);
    }
}
