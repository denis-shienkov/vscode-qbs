import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import * as QbsUtils from '../qbsutils';

import {QbsBaseNode} from './qbsbasenode';

import {QbsSourceArtifactData} from '../datatypes/qbssourceartifactdata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsSourceArtifactNode extends QbsBaseNode {
    constructor(
        private readonly _artifact: QbsSourceArtifactData,
        private readonly _isEnabled: boolean) {
        super(_artifact.id());
    }

    getTreeItem(): vscode.TreeItem {
        let label = this._artifact.fileName();
        if (!this._isEnabled) {
            label = QbsUtils.strikeLine(label);
        }
        const item = new vscode.TreeItem(label);
        item.resourceUri = vscode.Uri.file(this._artifact.filePath());
        item.command = {
            command: 'vscode.open',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri]
        };
        return item;
    }

    getChildren(): QbsBaseNode[] { return []; }
}
