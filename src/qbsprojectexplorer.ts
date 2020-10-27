import * as vscode from "vscode";

abstract class BaseNode {
    constructor(public readonly id: string) {}

    abstract getChildren(): BaseNode[];
    abstract getTreeItem(): vscode.TreeItem;
}

class QbsProjectDataProvider implements vscode.TreeDataProvider<BaseNode> {
    constructor() {}

    getTreeItem(node: BaseNode): vscode.TreeItem {
        return node.getTreeItem();
    }

    getChildren(node?: BaseNode): BaseNode[] {
        return [];
    }
}

export class QbsProjectExplorer implements vscode.Disposable {
    private _viewer: vscode.TreeView<BaseNode>;

    constructor() {
        const treeDataProvider = new QbsProjectDataProvider();
        this._viewer = vscode.window.createTreeView('qbs-project', {
            treeDataProvider: treeDataProvider,
            showCollapseAll: true
        });
    }

    dispose() { this._viewer.dispose(); }
}