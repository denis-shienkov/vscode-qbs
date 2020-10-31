import * as vscode from "vscode";
import * as nls from 'vscode-nls';
import {basename} from 'path';

import {QbsSession} from './qbssession';

const localize: nls.LocalizeFunc = nls.loadMessageBundle();

class QbsLocationData {
    constructor(private readonly _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    line(): number { return this._data['line']; }
    column(): number { return this._data['column']; }
    id(): string { return this.filePath() + ':' + this.line() + ':' + this.column(); }
}

class QbsProjectData {
    constructor(private readonly _data: any) {}
    id(): string { return this.buildDirectory(); }
    name(): string { return this._data['name']; }
    buildDirectory(): string { return this._data['build-directory']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }

    products(): QbsProductData[] {
        const products: QbsProductData[] = [];
        const datas = this._data['products'] || [];
        for (const data of datas) {
            const product = new QbsProductData(data);
            products.push(product);
        }
        return products;
    }

    subProjects(): QbsProjectData[] {
        const projects: QbsProjectData[] = [];
        const datas = this._data['sub-projects'] || [];
        for (const data of datas) {
            const project = new QbsProjectData(data);
            projects.push(project);
        }
        return projects;
    }
}

class QbsProductData {
    constructor(private readonly _data: any) {}
    id(): string { return this.buildDirectory(); }
    name(): string { return this._data['name']; }
    fullDisplayName() { return this._data['full-display-name']; }
    buildDirectory(): string { return this._data['build-directory']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }

    groups(): QbsGroupData[] {
        const groups: QbsGroupData[] = [];
        const datas = this._data['groups'] || [];
        for (const data of datas) {
            const group = new QbsGroupData(data);
            groups.push(group);
        }
        return groups;
    }
}

class QbsGroupData {
    constructor(private readonly _data: any) {}
    id(): string { return this.name(); }
    name(): string { return this._data['name']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }

    sourceArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas = this._data['source-artifacts'] || [];
        for (const data of datas) {
            artifacts.push(new QbsSourceArtifactData(data));
        }
        return artifacts;
    }

    sourceWildcardsArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas = this._data['source-artifacts-from-wildcards'] || [];
        for (const data of datas) {
            artifacts.push(new QbsSourceArtifactData(data));
        }
        return artifacts;
    }

    isEmpty(): boolean {
        return this.sourceArtifacts().length === 0 && this.sourceWildcardsArtifacts().length === 0;
    }
}

class QbsSourceArtifactData {
    constructor(private readonly _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    id(): string { return this.filePath(); }
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
            command: 'vscode.open',
            title: localize('open.file', 'Open file'),
            arguments: [item.resourceUri]
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
        for (const source of sources) {
            const node = new QbsSourceArtifactNode(source);
            nodes.push(node);
        }
        const wildcards = this._group.sourceWildcardsArtifacts();
        for (const wildcard of wildcards) {
            const node = new QbsSourceArtifactNode(wildcard);
            nodes.push(node);
        }
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
        for (const group of groups) {
            if (!group.isEmpty()) {
                const node = new QbsGroupNode(group);
                nodes.push(node);
            }
        }
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
        for (const product of products) {
            const node = new QbsProductNode(product);
            nodes.push(node);
        }
        const projects = this._project.subProjects();
        for (const project of projects) {
            const node = new QbsProjectNode(project, false);
            nodes.push(node);
        }
        return nodes;
    }

    dependentProductNames(): string[] {
        const productNames: string[] = [];
        const extractProductNames = (project: QbsProjectData) => {
            const products = project.products();
            for (const product of products) {
                productNames.push(product.fullDisplayName());
            }
            const projects = project.subProjects();
            for (const project of projects) {
                extractProductNames(project);
            }
        }
        extractProductNames(this._project);
        return productNames;
    }
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
            const project = new QbsProjectData(data);
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
            treeDataProvider: treeDataProvider,
            showCollapseAll: true
        });
    }

    dispose() { this._viewer.dispose(); }
}