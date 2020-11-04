import * as vscode from "vscode";
import * as nls from 'vscode-nls';

import {QbsSession} from './qbssession';
import {
    QbsSourceArtifactData, QbsLocationData,
    QbsGroupData, QbsProductData, QbsProjectData
} from './qbstypes';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

async function openTextDocumentAtPosition(uri: vscode.Uri, pos: vscode.Position) {
    await vscode.workspace.openTextDocument(uri).then(async (doc) => {
        await vscode.window.showTextDocument(doc).then(async (editor) => {
            editor.selections = [new vscode.Selection(pos, pos)];
            const range = new vscode.Range(pos, pos);
            editor.revealRange(range);
        });
    });
}

abstract class BaseNode {
    constructor(public readonly id: string) {}
    abstract getChildren(): BaseNode[];
    abstract getTreeItem(): vscode.TreeItem;
}

export class QbsSourceArtifactNode extends BaseNode {
    constructor(private readonly _artifact: QbsSourceArtifactData) {
        super(_artifact.id());
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._artifact.fileName());
        item.resourceUri = vscode.Uri.file(this._artifact.filePath());
        item.command = {
            command: 'vscode.open',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri]
        };
        return item;
    }

    getChildren(): BaseNode[] { return []; }
}

export class QbsLocationNode extends BaseNode {
    constructor(private readonly _location: QbsLocationData, private readonly _isQbsFile: boolean) {
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

    getChildren(): BaseNode[] { return []; }
}

export class QbsGroupNode extends BaseNode {
    constructor(private readonly _group: QbsGroupData) {
        super(_group.id());
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._group.name(), vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('group-by-ref-type');
        return item;
    }

    getChildren(): BaseNode[] {
        const nodes: BaseNode[] = [ new QbsLocationNode(this._group.location(), true) ];
        const sources = this._group.sourceArtifacts();
        sources.forEach(source => nodes.push(new QbsSourceArtifactNode(source)));
        const wildcards = this._group.sourceWildcardsArtifacts();
        wildcards.forEach(wildcard => nodes.push(new QbsSourceArtifactNode(wildcard)));
        return nodes;
    }
}

export class QbsProductNode extends BaseNode {
    constructor(private readonly _product: QbsProductData) {
        super(_product.id());
    }

    name(): string { return this._product.fullDisplayName(); }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._product.name(), vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('gift');
        item.contextValue = 'product-node'
        return item;
    }

    getChildren(): BaseNode[] {
        const nodes: BaseNode[] = [ new QbsLocationNode(this._product.location(), true) ];
        const groups = this._product.groups();
        groups.forEach(group => {
            if (!group.isEmpty()) {
                nodes.push(new QbsGroupNode(group));
            }
        });
        return nodes;
    }
}

export class QbsProjectNode extends BaseNode {
    constructor(private readonly _project: QbsProjectData, private readonly _isRoot: boolean) {
        super(_project.id());
    }

    getTreeItem(): vscode.TreeItem {
        const collapsible = this._isRoot ? vscode.TreeItemCollapsibleState.Expanded
                                         : vscode.TreeItemCollapsibleState.Collapsed;
        const item = new vscode.TreeItem(this._project.name(), collapsible);
        item.iconPath = new vscode.ThemeIcon('project');
        item.contextValue = this._isRoot ? 'root-project-node' : 'sub-project-node';
        return item;
    }

    getChildren(): BaseNode[] {
        const nodes: BaseNode[] = [ new QbsLocationNode(this._project.location(), true) ];
        const products = this._project.products();
        products.forEach(product => nodes.push(new QbsProductNode(product)));
        const projects = this._project.subProjects();
        projects.forEach(project => nodes.push(new QbsProjectNode(project, false)));
        return nodes;
    }

    dependentProductNames(): string[] {
        return this._project.allProducts().map(product => product.fullDisplayName());
    }
}

class QbsProjectDataProvider implements vscode.TreeDataProvider<BaseNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly _session: QbsSession) {
        _session.onProjectResolved(async () => this._onDidChangeTreeData.fire());
    }

    getTreeItem(node: BaseNode): vscode.TreeItem { return node.getTreeItem(); }

    getChildren(node?: BaseNode): BaseNode[] {
        if (node) {
            return node.getChildren();
        }
        const project = this._session.project()?.data();
        if (project) {
            return [ new QbsProjectNode(project, true) ];
        }
        return [];
    }
}

export class QbsProjectExplorer implements vscode.Disposable {
    private _viewer: vscode.TreeView<BaseNode>;

    constructor(session: QbsSession) {
        const treeDataProvider = new QbsProjectDataProvider(session);
        this._viewer = vscode.window.createTreeView('qbs-project', {
            treeDataProvider,
            showCollapseAll: true
        });
    }

    async subscribeCommands(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(vscode.commands.registerCommand('qbs.openTextDocumentAtPosition',
            async (uri: vscode.Uri, pos: vscode.Position) => {
                await openTextDocumentAtPosition(uri, pos);
        }));
    }

    dispose() { this._viewer.dispose(); }
}
