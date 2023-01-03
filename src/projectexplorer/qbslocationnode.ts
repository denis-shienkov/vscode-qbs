import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsCommandKey } from '../datatypes/qbscommandkey';
import { QbsProtocolLocationData } from '../protocol/qbsprotocollocationdata';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

/** The data type encapsulates the Qbs location object to display in the project tree. */
export class QbsLocationNode extends QbsBaseNode {
    private readonly fsPath: string
    private readonly name: string
    private readonly line: number
    private readonly column: number

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        locationData: QbsProtocolLocationData,
        private readonly isEnabled: boolean,
        private readonly isQbsFile: boolean) {
        super(resourcesPath, showDisabledNodes);

        const fsPath = locationData.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create location node because the file path is undefined');
        this.fsPath = fsPath;

        const name = locationData.getFileName();
        if (!name)
            throw new Error('Unable to create location node because the name is undefined');
        this.name = name;

        const line = locationData.getLine();
        if (!line)
            throw new Error('Unable to create location node because the line number is undefined');
        this.line = line;

        const column = locationData.getColumn();
        if (!column)
            throw new Error('Unable to create location node id because the line column is undefined');
        this.column = column;
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel());
        item.id = this.uuid;
        item.resourceUri = vscode.Uri.file(this.fsPath);
        item.command = QbsBaseNode.createOpenFileAtPositionCommand(
            item.resourceUri, new vscode.Position(this.line - 1, this.column - 1));
        return item;
    }

    public getChildren(): QbsBaseNode[] { return []; }

    private getLabel(): string {
        let input = this.name;
        if (this.isQbsFile)
            input += `:${this.line}`;
        return QbsBaseNode.createLabel(input, this.isEnabled);
    }
}
