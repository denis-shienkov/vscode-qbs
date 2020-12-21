import * as vscode from 'vscode';

import * as QbsUtils from '../qbsutils';

import {QbsBaseNode} from './qbsbasenode';
import {QbsGroupNode} from './qbsgroupnode';
import {QbsLocationNode} from './qbslocationnode';

import {QbsProductData} from '../datatypes/qbsproductdata';

export class QbsProductNode extends QbsBaseNode {
    constructor(private readonly _product: QbsProductData) {
        super(_product.id());
    }

    name(): string { return this._product.fullDisplayName(); }

    getTreeItem(): vscode.TreeItem {
        let label = this._product.name();
        if (!this._product.isEnabled()) {
            label = QbsUtils.strikeLine(label);
        }
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('gift');
        item.contextValue = 'product-node'
        return item;
    }

    getChildren(): QbsBaseNode[] {
        const nodes: QbsBaseNode[] = [ new QbsLocationNode(this._product.location(), true, this._product.isEnabled()) ];
        const groups = this._product.groups();
        groups.forEach(group => {
            if (!group.isEmpty()) {
                nodes.push(new QbsGroupNode(group));
            }
        });
        return nodes;
    }
}
