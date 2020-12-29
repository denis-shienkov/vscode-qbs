import * as vscode from 'vscode';
import * as path from 'path';

import * as QbsUtils from '../qbsutils';

import {QbsBaseNode} from './qbsbasenode';
import {QbsUnreferencedBuildSystemFileNode} from './qbsunreferencedbuildsystemfilenode';

import {QbsProjectData} from '../datatypes/qbsprojectdata';

function referencedBuildSystemFiles(project: QbsProjectData): string[] {
    const files: string[] = [];
    files.push(project.location().filePath());

    const subProjects = project.subProjects();
    subProjects.forEach(subProject => {
        const others = referencedBuildSystemFiles(subProject);
        files.push(...others);
    });

    const products = project.products();
    products.forEach(product => {
        files.push(product.location().filePath());
        const groups = product.groups();
        groups.forEach(group => {
            files.push(group.location().filePath());
        });
    });

    return files;
}

function unreferencedBuildSystemFiles(project: QbsProjectData): string[] {
    const unreferencedFiles = project.buildSystemFiles();
    const referencedFiles = referencedBuildSystemFiles(project);
    const result: string[] = [];
    for (const unreferencedFile of unreferencedFiles) {
        const index = referencedFiles.indexOf(unreferencedFile);
        if (index == -1) {
            result.push(unreferencedFile);
        }
    }
    return result;
}

export class QbsBuildSystemFilesNode extends QbsBaseNode {
    constructor(
        private readonly _project: QbsProjectData) {
        super('qbs-build-system-files');
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Qbs files', vscode.TreeItemCollapsibleState.Collapsed);
        return item;
    }

    getChildren(): QbsBaseNode[] {
        const nodes: QbsBaseNode[] = [];
        const projectDir = path.dirname(this._project.location().filePath());
        const buildDir = this._project.buildDirectory();
        const files = unreferencedBuildSystemFiles(this._project);
        files.forEach(file => {
            if (QbsUtils.isChildOf(file, projectDir) && !QbsUtils.isChildOf(file, buildDir)) {
                nodes.push(new QbsUnreferencedBuildSystemFileNode(file));
            }
        });
        return nodes;
    }
}
