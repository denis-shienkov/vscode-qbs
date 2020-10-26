import * as vscode from 'vscode';
import {basename} from 'path';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';
import {QbsBuildStep, QbsRunStep, QbsProduct, QbsRunEnvironment} from './qbssteps';

export class QbsProject implements vscode.Disposable {
    private _data?: any;
    private _buildStep: QbsBuildStep = new QbsBuildStep(this);
    private _runStep: QbsRunStep = new QbsRunStep(this);

    constructor(readonly _session: QbsSession, readonly _uri?: vscode.Uri) {}

    dispose() {
        this._buildStep.dispose();
        this._runStep.dispose();
    }

    session(): QbsSession { return this._session; }
    uri(): vscode.Uri | undefined { return this._uri; }
    name(): string { return this._uri ? basename(this._uri.fsPath) : 'unknown'; }
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
    setRunEnvironment(env: QbsRunEnvironment) { this._runStep.setup(undefined, undefined, env); }
    buildStep(): QbsBuildStep { return this._buildStep; }
    runStep(): QbsRunStep { return this._runStep; }
    isEmpty(): boolean { return this._data; }

    async enumerateProducts(): Promise<QbsProduct[]> {
        let products: QbsProduct[] = [];
        const parseProject = (project: any) => {
            const datas = project ? (project['products'] || []) : [];
            for (const data of datas) {
                const product = new QbsProduct(data);
                products.push(product);
            }

            const subProjects = project ? (project['sub-projects'] || []) : [];
            for (const subProject of subProjects) {
                parseProject(subProject);
            }
        };
        parseProject(this._data);
        return products;
    }

    async updateSteps() {
        await this._buildStep.restore();
        await this._runStep.restore();
    }

    async restore() {
        await this._buildStep.restore();
        await new Promise<void>(resolve => {
            const projectResolvedSubscription = this.session().onProjectResolved(result => {
                this.updateSteps();
                projectResolvedSubscription.dispose();
                resolve();
            });
            this.session().autoResolve(200);
        });
    }

    /**
     * Returns the list of paths of all found QBS project files
     * with the *.qbs extension in the current workspace directory.
     */
    static async enumerateWorkspaceProjects(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles('*.qbs');
    }
}
