import * as vscode from 'vscode';

import {QbsBaseNode} from './qbsbasenode';
import {QbsLocationNode} from './qbslocationnode';
import {QbsProductNode} from './qbsproductnode';

import {QbsProjectData} from '../datatypes/qbsprojectdata';

export class QbsProjectNode extends QbsBaseNode {
    constructor(
        private readonly _project: QbsProjectData,
        private readonly _isRoot: boolean) {
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

    getChildren(): QbsBaseNode[] {
        const nodes: QbsBaseNode[] = [ new QbsLocationNode(this._project.location(), true) ];
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
