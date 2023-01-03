import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsProtocolSourceArtifactData } from '../protocol/qbsprotocolsourceartifactdata';

/** The data type encapsulates the Qbs source artifact object to display in the project tree. */
export class QbsSourceArtifactNode extends QbsBaseNode {
    private readonly name: string
    private readonly fsPath: string

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        artifactData: QbsProtocolSourceArtifactData,
        private readonly isEnabled: boolean) {
        super(resourcesPath, showDisabledNodes);

        const name = artifactData.getFileName();
        if (!name)
            throw new Error('Unable to create source artifact node because the file name is undefined');
        this.name = name;

        const fsPath = artifactData.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create source artifact node because the file path is undefined');
        this.fsPath = fsPath;
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel());
        item.id = this.uuid;
        item.resourceUri = vscode.Uri.file(this.fsPath);
        item.command = QbsBaseNode.createOpenFileCommand(item.resourceUri);
        return item;
    }

    public getChildren(): QbsBaseNode[] { return []; }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
}
