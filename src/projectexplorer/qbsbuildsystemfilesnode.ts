import * as nls from 'vscode-nls';
import * as path from 'path';
import * as vscode from 'vscode';

import { isChildOf } from '../qbsutils';
import { QbsBaseNode } from './qbsbasenode';
import { QbsProtocolProjectData } from '../protocol/qbsprotocolprojectdata';
import { QbsUnreferencedBuildSystemFileNode } from './qbsunreferencedbuildsystemfilenode';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

enum QbsBuildSystemFilesNodeIcon {
    Qbs = 'folder-qbs.svg',
}

/** The data type encapsulates the Qbs build system files (aka `*.qbs` files)
 * to display in the project tree. */
export class QbsBuildSystemFilesNode extends QbsBaseNode {
    private readonly buildSystemFiles: string[]

    public constructor(
        resourcesPath: string,
        showDisabledNodes: boolean,
        projectData: QbsProtocolProjectData) {
        super(resourcesPath, showDisabledNodes);

        const location = projectData.getLocation();
        if (!location)
            throw new Error('Unable to create build system files node because the location is undefined');
        const fsPath = location.getFilePath();
        if (!fsPath)
            throw new Error('Unable to create build system files node because the file path is undefined');
        const buildDirectory = projectData.getBuildDirectory();
        if (!buildDirectory)
            throw new Error('Unable to create build system files node because the build directory is undefined');

        const projectDirectory = path.dirname(fsPath);
        this.buildSystemFiles = QbsBuildSystemFilesNode.collectUnreferencedBuildSystemFiles(projectData)
            .filter(fsPath => QbsBuildSystemFilesNode.fileIsChild(
                fsPath, projectDirectory, buildDirectory));
    }

    public getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.getLabel());
        item.id = this.uuid;
        item.iconPath = {
            light: vscode.Uri.file(path.join(this.resourcesPath, 'light', QbsBuildSystemFilesNodeIcon.Qbs)),
            dark: vscode.Uri.file(path.join(this.resourcesPath, 'dark', QbsBuildSystemFilesNodeIcon.Qbs)),
        };
        return item;
    }

    public getChildren(): QbsBaseNode[] {
        return this.buildSystemFiles.map(fsPath => new QbsUnreferencedBuildSystemFileNode(
            this.resourcesPath, this.showDisabledNodes, fsPath));
    }

    private static collectReferencedBuildSystemFiles(projectData: QbsProtocolProjectData): string[] {
        const fsPaths: string[] = [];
        const fsPath = projectData.getLocation()?.getFilePath();
        if (fsPath)
            fsPaths.push(fsPath);
        projectData.getSubProjects().forEach(subProjectData => {
            const others = QbsBuildSystemFilesNode.collectReferencedBuildSystemFiles(subProjectData);
            fsPaths.push(...others);
        });
        projectData.getProducts().forEach(productData => {
            const fsPath = productData.getLocation()?.getFilePath();
            if (fsPath)
                fsPaths.push(fsPath);
            productData.getGroups().forEach(groupData => {
                const fsPath = groupData.getLocation()?.getFilePath();
                if (fsPath)
                    fsPaths.push(fsPath);
            });
        });
        return fsPaths;
    }

    private static fileIsChild(fsPath: string, projectDir: string, buildDir: string): boolean {
        return isChildOf(fsPath, projectDir) && !isChildOf(fsPath, buildDir);
    }

    private static collectUnreferencedBuildSystemFiles(projectData: QbsProtocolProjectData): string[] {
        const fsPaths = QbsBuildSystemFilesNode.collectReferencedBuildSystemFiles(projectData);
        return projectData.getBuildSystemFiles().filter(fsPath => { return !fsPaths.includes(fsPath); });
    }

    private getLabel(): string { return localize('qbs.build.system.files.entry', 'Qbs files'); }
}
