import * as vscode from 'vscode';

import { QbsBaseNode, QbsBaseNodeContext } from './qbsbasenode';
import { QbsBuildSystemFilesNode } from './qbsbuildsystemfilesnode';
import { QbsLocationNode } from './qbslocationnode';
import { QbsProductNode } from './qbsproductnode';
import { QbsProtocolLocationData } from '../protocol/qbsprotocollocationdata';
import { QbsProtocolProductData } from '../protocol/qbsprotocolproductdata';
import { QbsProtocolProjectData } from '../protocol/qbsprotocolprojectdata';

enum QbsProjectNodeIcon {
    RootProduct = 'root-folder',
    SubProduct = 'folder',
}

/** The data type encapsulates the Qbs project object to display in the project tree. */
export class QbsProjectNode extends QbsBaseNode {
    private readonly name: string
    private readonly location: QbsProtocolLocationData
    private readonly fsPath: string
    private readonly products: QbsProtocolProductData[]
    private readonly subprojects: QbsProtocolProjectData[]
    private readonly dependencies: string[]
    private readonly isEnabled: boolean

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        private readonly showEmptyGroups: boolean,
        private readonly projectData: QbsProtocolProjectData,
        private readonly isRoot: boolean) {
        super(resourcesPath, showDisabledNodes);

        const name = this.projectData.getName();
        if (!name)
            throw new Error('Unable to create project node because the name is undefined');
        this.name = name;

        const location = this.projectData.getLocation();
        if (!location)
            throw new Error('Unable to create project node because the location is undefined');
        this.location = location;

        const fsPath = this.location.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create project node because the file path is undefined');
        this.fsPath = fsPath;

        this.products = this.projectData.getProducts()
            .filter(productData => this.checkIsProductVisible(productData));
        this.subprojects = this.projectData.getSubProjects()
            .filter(projectData => this.checkIsSubProjectVisible(projectData));
        this.isEnabled = this.projectData.getIsEnabled() || false;

        this.dependencies = this.projectData.getAllRecursiveProducts()
            .filter(productData => productData.getFullDisplayName())
            .map(productData => productData.getFullDisplayName() || '');
    }

    // TODO: For build command!
    public getDependentProductNames(): string[] { return this.dependencies; }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel(), this.getCollapsibleState());
        item.id = this.uuid;
        item.contextValue = this.getContextValue();
        item.iconPath = new vscode.ThemeIcon(this.getIcon());
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        let childrenNodes: QbsBaseNode[] = [
            ...[new QbsLocationNode(
                this.resourcesPath, this.showDisabledNodes, this.location, this.isEnabled, true)],
            ...this.products.map(productData => new QbsProductNode(
                this.resourcesPath, this.showDisabledNodes, this.showEmptyGroups, productData)),
            ...this.subprojects.map(projectData => new QbsProjectNode(
                this.resourcesPath, this.showDisabledNodes, this.showEmptyGroups, projectData, false))
        ];
        if (this.isRoot)
            childrenNodes.push(new QbsBuildSystemFilesNode(
                this.resourcesPath, this.showDisabledNodes, this.projectData));
        return childrenNodes;
    }

    private checkIsProductVisible(productData: QbsProtocolProductData): boolean {
        return (!this.showDisabledNodes && !productData.getIsEnabled()) ? false : true;
    }

    private checkIsSubProjectVisible(projectData: QbsProtocolProjectData): boolean {
        return (!this.showDisabledNodes && !projectData.getIsEnabled()) ? false : true;
    }

    private getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return (this.isRoot) ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
    }

    private getContextValue(): string {
        return (this.isRoot) ? QbsBaseNodeContext.RootProject : QbsBaseNodeContext.SubProject
    }

    private getIcon(): string {
        return (this.isRoot) ? QbsProjectNodeIcon.RootProduct : QbsProjectNodeIcon.SubProduct;
    }

    private getLabel(): string { return QbsBaseNode.createLabel(this.name, this.isEnabled); }
}
