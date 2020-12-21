import * as vscode from 'vscode';

import * as QbsUtils from '../qbsutils';

import {QbsBaseNode} from './qbsbasenode';
import {QbsLocationNode} from './qbslocationnode';
import {QbsSourceArtifactNode} from './qbssourceartifactnode';

import {QbsGroupData} from '../datatypes/qbsgroupdata';

export class QbsGroupNode extends QbsBaseNode {
    constructor(private readonly _group: QbsGroupData) {
        super(_group.id());
    }

    getTreeItem(): vscode.TreeItem {
        let label = this._group.name();
        if (!this._group.isEnabled()) {
            label = QbsUtils.strikeLine(label);
        }
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('group-by-ref-type');
        return item;
    }

    getChildren(): QbsBaseNode[] {
        const isEnabled = this._group.isEnabled();
        const nodes: QbsBaseNode[] = [ new QbsLocationNode(this._group.location(), true, isEnabled) ];
        const sources = this._group.sourceArtifacts();
        sources.forEach(source => nodes.push(new QbsSourceArtifactNode(source, isEnabled)));
        const wildcards = this._group.sourceWildcardsArtifacts();
        wildcards.forEach(wildcard => nodes.push(new QbsSourceArtifactNode(wildcard, isEnabled)));
        return nodes;
    }
}
