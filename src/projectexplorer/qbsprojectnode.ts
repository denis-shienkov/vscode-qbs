import * as vscode from 'vscode';

import * as QbsUtils from '../qbsutils';

import {QbsBaseNode} from './qbsbasenode';
import {QbsLocationNode} from './qbslocationnode';
import {QbsProductNode} from './qbsproductnode';

import {QbsProjectData} from '../datatypes/qbsprojectdata';

export class QbsProjectNode extends QbsBaseNode {
    constructor(
        private readonly _project: QbsProjectData,
        private readonly _isRoot: boolean,
        private readonly _showDisabledNodes: boolean) {
        super(_project.id());
    }

    getTreeItem(): vscode.TreeItem {
        const collapsible = this._isRoot ? vscode.TreeItemCollapsibleState.Expanded
                                         : vscode.TreeItemCollapsibleState.Collapsed;
        let label = this._project.name();
        if (!this._project.isEnabled()) {
            label = QbsUtils.strikeLine(label);
        }
        const item = new vscode.TreeItem(label, collapsible);
        item.iconPath = new vscode.ThemeIcon('project');
        item.contextValue = this._isRoot ? 'root-project-node' : 'sub-project-node';
        return item;
    }

    getChildren(): QbsBaseNode[] {
        const nodes: QbsBaseNode[] = [ new QbsLocationNode(this._project.location(), true, this._project.isEnabled()) ];

        const products = this._project.products();
        products.forEach(product => {
            if (!this._showDisabledNodes && !product.isEnabled()) {
                return;
            } else {
                nodes.push(new QbsProductNode(product, this._showDisabledNodes));
            }
        });

        const projects = this._project.subProjects();
        projects.forEach(project => {
            nodes.push(new QbsProjectNode(project, false, this._showDisabledNodes));
        });

        return nodes;
    }

    dependentProductNames(): string[] {
        return this._project.allProducts().map(product => product.fullDisplayName());
    }
}
