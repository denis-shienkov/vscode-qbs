import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';

/** The data type encapsulates the Qbs unreferenced build file object to display in the project tree. */
export class QbsUnreferencedBuildSystemFileNode extends QbsBaseNode {
    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        private readonly fsPath: string) {
        super(resourcesPath, showDisabledNodes);
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.fsPath);
        item.id = this.uuid;
        item.resourceUri = vscode.Uri.file(this.fsPath);
        item.command = QbsBaseNode.createOpenFileCommand(item.resourceUri);
        return item;
    }

    public getChildren(): QbsBaseNode[] { return []; }
}
