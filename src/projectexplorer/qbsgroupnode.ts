import * as path from 'path';
import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsFolderData } from './qbsfolderdata';
import { QbsFolderNode } from './qbsfoldernode';
import { QbsLocationNode } from './qbslocationnode';
import { QbsProtocolGroupData } from '../protocol/qbsprotocolgroupdata';
import { QbsProtocolLocationData } from '../protocol/qbsprotocollocationdata';
import { QbsSourceArtifactNode } from './qbssourceartifactnode';

enum QbsGroupNodeIcon {
    Group = 'files',
}

/** The data type encapsulates the Qbs files group object to display in the project tree. */
export class QbsGroupNode extends QbsBaseNode {
    private readonly name: string
    private readonly location: QbsProtocolLocationData
    private readonly folder: QbsFolderData
    private readonly isEnabled: boolean

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        groupData: QbsProtocolGroupData) {
        super(resourcesPath, showDisabledNodes);

        const name = groupData.getName();
        if (!name)
            throw new Error('Unable to create group node because the name is undefined');
        this.name = name;

        const location = groupData.getLocation();
        if (!location)
            throw new Error('Unable to create group node because the location is undefined');
        this.location = location;

        const fsPath = location.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create group node because the file path is undefined');
        const fsParent = path.dirname(fsPath);

        const allSources = [...groupData.getSourceArtifacts(), ...groupData.getSourceWildcardArtifacts()];
        this.folder = new QbsFolderData(allSources, fsParent);
        this.isEnabled = groupData.getIsEnabled() || false;
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel(), vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.uuid;
        item.iconPath = new vscode.ThemeIcon(QbsGroupNodeIcon.Group);
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        return [
            ...[new QbsLocationNode(
                this.resourcesPath, this.showDisabledNodes, this.location, this.isEnabled, true)],
            ...this.folder.getFolders().map(folderData => new QbsFolderNode(
                this.resourcesPath, this.showDisabledNodes, folderData, this.isEnabled)),
            ...this.folder.getSources().map(artifactData => new QbsSourceArtifactNode(
                this.resourcesPath, this.showDisabledNodes, artifactData, this.isEnabled))
        ];
    }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
}
