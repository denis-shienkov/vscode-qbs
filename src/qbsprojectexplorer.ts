import * as vscode from "vscode";
import * as nls from 'vscode-nls';
import {basename} from 'path';

import {QbsSession} from './qbssession';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

abstract class BaseNode {
    constructor(public readonly id: string) {}
    abstract getChildren(): BaseNode[];
    abstract getTreeItem(): vscode.TreeItem;
}

class QbsLocation {
    constructor(private _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    line(): number { return this._data['line']; }
    column(): number { return this._data['column']; }
    id(): string { return this.filePath() + ':' + this.line() + ':' + this.column(); }
}

class QbsSourceArtifact {
    constructor(private _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    id(): string { return this.filePath(); }
}

class QbsSourceArtifactNode extends BaseNode {
    constructor(private readonly _artifact: QbsSourceArtifact) {
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

class QbsLocationNode extends BaseNode {
    constructor(private readonly _location: QbsLocation, private readonly _isQbsFile: boolean) {
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
            command: 'vscode.open',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri]
        };
        return item;
    }

    getChildren(): BaseNode[] { return []; }
}

class QbsGroupNode extends BaseNode {
    constructor(private readonly _data: any) {
        super(_data['name']);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.name(), vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('group-by-ref-type');
        return item;
    }

    getChildren(): BaseNode[] {
        let nodes: BaseNode[] = [new QbsLocationNode(this.location(), true)];
        const sources = this._data['source-artifacts'] || [];
        for (const source of sources) {
            const artifact = new QbsSourceArtifact(source);
            const node = new QbsSourceArtifactNode(artifact);
            nodes.push(node);
        }
        const wildcards = this._data['source-artifacts-from-wildcards'] || [];
        for (const wildcard of wildcards) {
            const artifact = new QbsSourceArtifact(wildcard);
            const node = new QbsSourceArtifactNode(artifact);
            nodes.push(node);
        }
        return nodes;
    }

    private name(): string { return this._data['name']; }
    private location(): QbsLocation { return new QbsLocation(this._data['location']); }
}

class QbsProductNode extends BaseNode {
    constructor(private readonly _data: any) {
        super(_data['build-directory']);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.name(), vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('gift');
        return item;
    }

    getChildren(): BaseNode[] {
        let nodes: BaseNode[] = [new QbsLocationNode(this.location(), true)];
        const groups = this._data['groups'] || [];
        for (const group of groups) {
            const node = new QbsGroupNode(group);
            nodes.push(node);
        }
        return nodes;
    }

    private name(): string { return this._data['name']; }
    private location(): QbsLocation { return new QbsLocation(this._data['location']); }
}

class QbsProjectNode extends BaseNode {
    constructor(private readonly _data: any, private readonly _isRoot: boolean) {
        super(_data['build-directory']);
    }

    getTreeItem(): vscode.TreeItem {
        const collapsible = this._isRoot ? vscode.TreeItemCollapsibleState.Expanded
                                         : vscode.TreeItemCollapsibleState.Collapsed;
        const item = new vscode.TreeItem(this.name(), collapsible);
        item.iconPath = new vscode.ThemeIcon('project');
        return item;
    }

    getChildren(): BaseNode[] {
        let nodes: BaseNode[] = [new QbsLocationNode(this.location(), true)];
        const products = this._data['products'] || [];
        for (const product of products) {
            const node = new QbsProductNode(product);
            nodes.push(node);
        }
        const projects = this._data['sub-projects'] || [];
        for (const project of projects) {
            const node = new QbsProjectNode(project, false);
            nodes.push(node);
        }

        return nodes;
    }

    private name(): string { return this._data['name']; }
    private location(): QbsLocation { return new QbsLocation(this._data['location']); }
}

class QbsProjectDataProvider implements vscode.TreeDataProvider<BaseNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(readonly _session: QbsSession) {
        _session.onProjectResolved(async () => this._onDidChangeTreeData.fire());
    }

    getTreeItem(node: BaseNode): vscode.TreeItem { return node.getTreeItem(); }

    getChildren(node?: BaseNode): BaseNode[] {
        if (node) {
            return node.getChildren();
        }
        const data = this._session.project()?.data();
        if (data) {
            return [ new QbsProjectNode(data, true) ];
        }
        return [];
    }
}

export class QbsProjectExplorer implements vscode.Disposable {
    private _viewer: vscode.TreeView<BaseNode>;

    constructor(session: QbsSession) {
        const treeDataProvider = new QbsProjectDataProvider(session);
        this._viewer = vscode.window.createTreeView('qbs-project', {
            treeDataProvider: treeDataProvider,
            showCollapseAll: true
        });
    }

    dispose() { this._viewer.dispose(); }
}