import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsLocationNode } from './qbslocationnode';
import { QbsProtocolGroupData } from '../protocol/qbsprotocolgroupdata';
import { QbsProtocolSourceArtifactData } from '../protocol/qbsprotocolsourceartifactdata';
import { QbsSourceArtifactNode } from './qbssourceartifactnode';
import { QbsProtocolLocationData } from '../protocol/qbsprotocollocationdata';

enum QbsPGroupNodeIcon {
    Group = 'files',
}

/** The data type encapsulates the Qbs files group object to display in the project tree. */
export class QbsGroupNode extends QbsBaseNode {
    private readonly name: string
    private readonly location: QbsProtocolLocationData
    private readonly fsPath: string
    private readonly sources: QbsProtocolSourceArtifactData[];
    private readonly wildcards: QbsProtocolSourceArtifactData[];
    private readonly isEnabled: boolean

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        groupData: QbsProtocolGroupData,
        private readonly parentId: string) {
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
        this.fsPath = fsPath;

        this.sources = groupData.getSourceArtifacts();
        this.wildcards = groupData.getSourceWildcardArtifacts();
        this.isEnabled = groupData.getIsEnabled() || false;
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel(), vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.getId();
        item.iconPath = new vscode.ThemeIcon(QbsPGroupNodeIcon.Group);
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        return [
            ...[new QbsLocationNode(
                this.resourcesPath, this.showDisabledNodes, this.location, this.isEnabled, true, this.getId())],
            ...this.sources.map(artifactData => new QbsSourceArtifactNode(
                this.resourcesPath, this.showDisabledNodes, artifactData, this.isEnabled, this.getId())),
            ...this.wildcards.map(artifactData => new QbsSourceArtifactNode(
                this.resourcesPath, this.showDisabledNodes, artifactData, this.isEnabled, this.getId()))
        ];
    }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
    private getId(): string { return `${this.parentId}:${this.name}:${this.fsPath}`; }
}
