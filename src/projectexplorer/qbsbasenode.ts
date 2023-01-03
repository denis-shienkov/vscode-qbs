import { v4 as uuidv4 } from 'uuid';
import * as nls from 'vscode-nls';
import * as path from 'path';
import * as vscode from 'vscode';

import { QbsCommandKey } from '../datatypes/qbscommandkey';
import { strikeLine } from '../qbsutils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export enum QbsBaseNodeContext {
    Product = 'product-node',
    RootProject = 'root-project-node',
    SourceArtifact = 'source-artifact-node',
    SubProject = 'sub-project-node',
}

export enum QbsBaseNodeTheme {
    Light = 'light',
    Dark = 'dark',
}

/** The abstract data type encapsulates the project explorer nodes
 * (e.g. project, product, artifaact and etc.), which are displayed
 * in the project tree. */
export abstract class QbsBaseNode {
    protected readonly uuid = uuidv4();

    public constructor(
        protected readonly resourcesPath: string,
        protected readonly showDisabledNodes: boolean) { }

    public abstract getTreeItem(): vscode.TreeItem;
    public abstract getChildren(): QbsBaseNode[];

    protected static createLabel(input?: string, isEnabled?: boolean): string {
        if (!input)
            throw new Error('Unable to create node label because the input is undefined');
        return (isEnabled) ? input : strikeLine(input);
    }

    protected static createOpenFileCommand(resourceUri: vscode.Uri): vscode.Command {
        return {
            command: QbsCommandKey.OpenTextDocument,
            title: localize('open.file', 'Open file'),
            arguments: [resourceUri]
        }
    }

    protected static createOpenFileAtPositionCommand(resourceUri: vscode.Uri, position: vscode.Position): vscode.Command {
        return {
            command: QbsCommandKey.OpenTextDocumentAtPosition,
            title: localize('open.file', 'Open file'),
            arguments: [resourceUri, position]
        }
    }

    protected getIconPath(theme: QbsBaseNodeTheme, icon: string) {
        return path.join(this.resourcesPath, theme, icon);
    }
}
