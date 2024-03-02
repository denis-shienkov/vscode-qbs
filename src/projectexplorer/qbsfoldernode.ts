import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsFolderData } from './qbsfolderdata';
import { QbsProtocolSourceArtifactData } from '../protocol/qbsprotocolsourceartifactdata';
import { QbsSourceArtifactNode } from './qbssourceartifactnode';

enum QbsFolderNodeIcon {
    Folder = 'folder',
}

/** The data type encapsulates the Qbs files folder object to display in the project tree. */
export class QbsFolderNode extends QbsBaseNode {
    private readonly name: string
    private readonly folders: QbsFolderData[]
    private readonly sources: QbsProtocolSourceArtifactData[]

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        folderData: QbsFolderData,
        private readonly isEnabled: boolean) {
        super(resourcesPath, showDisabledNodes);

        const name = folderData.getName();
        if (!name)
            throw new Error('Unable to create folder node because the name is undefined');
        this.name = name;

        this.folders = folderData.getFolders();
        this.sources = folderData.getSources();
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel(), vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.uuid;
        item.iconPath = new vscode.ThemeIcon(QbsFolderNodeIcon.Folder);
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        return [
            ...this.folders.map(folderData => new QbsFolderNode(
                this.resourcesPath, this.showDisabledNodes, folderData, this.isEnabled)),
            ...this.sources.map(artifactData => new QbsSourceArtifactNode(
                this.resourcesPath, this.showDisabledNodes, artifactData, this.isEnabled))
        ];
    }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
}
