import * as vscode from 'vscode';

import {QbsBaseNode} from './qbsbasenode';
import {QbsLocationNode} from './qbslocationnode';
import {QbsSourceArtifactNode} from './qbssourceartifactnode';

import {QbsGroupData} from '../datatypes/qbsgroupdata';

export class QbsGroupNode extends QbsBaseNode {
    constructor(private readonly _group: QbsGroupData) {
        super(_group.id());
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this._group.name(), vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('group-by-ref-type');
        return item;
    }

    getChildren(): QbsBaseNode[] {
        const nodes: QbsBaseNode[] = [ new QbsLocationNode(this._group.location(), true) ];
        const sources = this._group.sourceArtifacts();
        sources.forEach(source => nodes.push(new QbsSourceArtifactNode(source)));
        const wildcards = this._group.sourceWildcardsArtifacts();
        wildcards.forEach(wildcard => nodes.push(new QbsSourceArtifactNode(wildcard)));
        return nodes;
    }
}
