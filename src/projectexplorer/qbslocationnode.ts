import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsBaseNode} from './qbsbasenode';

import {QbsLocationData} from '../datatypes/qbslocationdata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsLocationNode extends QbsBaseNode {
    constructor(
        private readonly _location: QbsLocationData,
        private readonly _isQbsFile: boolean) {
        super(_location.id());
    }

    getTreeItem(): vscode.TreeItem {
        let label = this._location.fileName();
        if (this._isQbsFile) {
            label += ':' + this._location.line();
        }
        const item = new vscode.TreeItem(label);
        item.resourceUri = vscode.Uri.file(this._location.filePath());
        item.command = {
            command: 'qbs.openTextDocumentAtPosition',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri, new vscode.Position(this._location.line() - 1, this._location.column() - 1)]
        };
        return item;
    }

    getChildren(): QbsBaseNode[] { return []; }
}
