import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsBaseNode} from './qbsbasenode';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsUnreferencedBuildSystemFileNode extends QbsBaseNode {
    constructor(
        private readonly _filePath: string) {
        super(_filePath);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._filePath);
        item.resourceUri = vscode.Uri.file(this._filePath);
        item.command = {
            command: 'vscode.open',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri]
        };
        return item;
    }

    getChildren(): QbsBaseNode[] { return []; }
}
