import * as vscode from 'vscode';

import { QbsBaseNode, QbsBaseNodeContext, QbsBaseNodeTheme } from './qbsbasenode';
import { QbsGroupNode } from './qbsgroupnode';
import { QbsLocationNode } from './qbslocationnode';
import { QbsProtocolGroupData } from '../protocol/qbsprotocolgroupdata';
import { QbsProtocolLocationData } from '../protocol/qbsprotocollocationdata';
import { QbsProtocolProductData } from '../protocol/qbsprotocolproductdata';
import { QbsProtocolProductType } from '../protocol/qbsprotocolproductdata';

enum QbsProductNodeIcon {
    Application = 'folder-application.svg',
    Library = 'folder-library',
    Other = 'folder-other.svg',
}

/** The data type encapsulates the Qbs product object to display in the project tree. */
export class QbsProductNode extends QbsBaseNode {
    private readonly name: string
    private readonly fullName: string
    private readonly location: QbsProtocolLocationData
    private readonly fsPath: string
    private readonly line: number
    private readonly groups: QbsProtocolGroupData[]
    private readonly types: string[];
    private readonly isEnabled: boolean

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        productData: QbsProtocolProductData,
        private readonly parentId: string) {
        super(resourcesPath, showDisabledNodes);

        const name = productData.getName();
        if (!name)
            throw new Error('Unable to create product node because the name is undefined');
        this.name = name;

        const fullName = productData.getFullDisplayName();
        if (!fullName)
            throw new Error('Unable to create product node because the full name is undefined');
        this.fullName = fullName;

        const location = productData.getLocation();
        if (!location)
            throw new Error('Unable to create product node because the location is undefined');
        this.location = location;

        const fsPath = location.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create product node because the file path is undefined');
        this.fsPath = fsPath;

        const line = location.getLine();
        if (!line)
            throw new Error('Unable to create product node because the line number is undefined');
        this.line = line;

        this.groups = productData.getGroups()
            .filter(groupData => this.checkIsGroupVisible(groupData));
        this.types = productData.getType();
        this.isEnabled = productData.getIsEnabled() || false;
    }

    // TODO: For build command!
    public getFullName(): string { return this.fullName; }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel(), vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.getId();
        item.contextValue = QbsBaseNodeContext.Product;
        item.iconPath = this.getIcon();
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        return [
            ...[new QbsLocationNode(
                this.resourcesPath, this.showDisabledNodes, this.location, this.isEnabled, true, this.getId())],
            ...this.groups.map(groupData => new QbsGroupNode(
                this.resourcesPath, this.showDisabledNodes, groupData, this.getId()))
        ];
    }

    private checkIsGroupVisible(groupData: QbsProtocolGroupData): boolean {
        if (!this.showDisabledNodes && !groupData.getIsEnabled())
            return false;
        return !groupData.getIsEmpty();
    }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
    private getId(): string { return `${this.parentId}:${this.fullName}:${this.fsPath}:${this.line}`; }

    private getIcon(): any {
        const other_product = {
            light: this.getIconPath(QbsBaseNodeTheme.Light, QbsProductNodeIcon.Other),
            dark: this.getIconPath(QbsBaseNodeTheme.Dark, QbsProductNodeIcon.Other),
        };
        const icons = this.types.filter(type => {
            switch (type) {
                case QbsProtocolProductType.Application:
                case QbsProtocolProductType.DynamicLibrary:
                case QbsProtocolProductType.StaticLibrary:
                    return true;
                default:
                    return false;
            }
        }).map(type => {
            switch (type) {
                case QbsProtocolProductType.Application: {
                    return {
                        light: this.getIconPath(QbsBaseNodeTheme.Light, QbsProductNodeIcon.Application),
                        dark: this.getIconPath(QbsBaseNodeTheme.Dark, QbsProductNodeIcon.Application),
                    };
                }
                case QbsProtocolProductType.DynamicLibrary:
                case QbsProtocolProductType.StaticLibrary:
                    return new vscode.ThemeIcon(QbsProductNodeIcon.Library);
                default: {
                    return other_product;
                }
            }
        });
        return (icons && icons.length) ? icons[0] : other_product;
    }
}
