import * as vscode from 'vscode';

export abstract class QbsBaseNode {
    constructor(public readonly id: string) {}

    abstract getChildren(): QbsBaseNode[];
    abstract getTreeItem(): vscode.TreeItem;
}
