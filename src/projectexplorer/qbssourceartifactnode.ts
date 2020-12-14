import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsBaseNode} from './qbsbasenode';

import {QbsSourceArtifactData} from '../datatypes/qbssourceartifactdata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsSourceArtifactNode extends QbsBaseNode {
    constructor(private readonly _artifact: QbsSourceArtifactData) {
        super(_artifact.id());
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._artifact.fileName());
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
