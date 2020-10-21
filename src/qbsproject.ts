import * as vscode from 'vscode';
import {basename} from 'path';

import * as QbsUtils from './qbsutils';

import {QbsBuildStep, QbsRunStep, QbsProduct, QbsRunEnvironment} from './qbssteps';

export class QbsProject implements vscode.Disposable {
    private _data?: any;
    private _buildStep: QbsBuildStep = new QbsBuildStep();
    private _runStep: QbsRunStep = new QbsRunStep();

    constructor(readonly _uri?: vscode.Uri) {}

    dispose() {
        this._buildStep.dispose();
        this._runStep.dispose();
    }

    uri(): vscode.Uri | undefined { return this._uri; }
    name(): string { return this._uri ? basename(this._uri.fsPath) : ''; }
    filePath(): string { return QbsUtils.fixPathSeparators(this._uri?.fsPath || ''); }

    setData(response: any, withBuildSystemFiles: boolean) {
        const data = response['project-data'];
        if (data) {
            this._data = data;
            if (!withBuildSystemFiles) {
                this._data['build-system-files'] = data['build-system-files'];
            }
        }
    }

    data(): any | undefined { return this._data; }
    setRunEnvironment(env: QbsRunEnvironment) { this._runStep.setRunEnvironment(env); }
    buildStep(): QbsBuildStep { return this._buildStep; }
    runStep(): QbsRunStep { return this._runStep; }
    isEmpty(): boolean { return this._data; }

    async enumerateProducts(): Promise<QbsProduct[]> {
        let products: QbsProduct[] = [];
        const parseProject = (project: any) => {
            const datas = project['products'] || [];
            for (const data of datas) {
                const product = new QbsProduct(data);
                products.push(product);
            }
    
            const subProjects = project['sub-projects'] || [];
            for (const subProject of subProjects) {
                parseProject(subProject);
            }
        };
        parseProject(this._data);
        return products;
    }

    /**
     * Returns the list of paths of all found QBS project files
     * with the *.qbs extension in the current workspace directory.
     */
    static async enumerateWorkspaceProjects(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles('*.qbs');
    }
}
