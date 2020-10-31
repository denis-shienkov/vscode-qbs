import * as vscode from 'vscode';
import {basename} from 'path';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';
import {QbsBuildStep, QbsRunStep} from './qbssteps';
import {QbsProjectData, QbsProductData, QbsRunEnvironmentData} from './qbstypes';

export class QbsProject implements vscode.Disposable {
    private _data?: QbsProjectData;
    private _buildStep: QbsBuildStep = new QbsBuildStep(this);
    private _runStep: QbsRunStep = new QbsRunStep(this);

    constructor(private readonly _session: QbsSession, readonly _uri?: vscode.Uri) {}

    dispose() {
        this._buildStep.dispose();
        this._runStep.dispose();
    }

    session(): QbsSession { return this._session; }
    uri(): vscode.Uri | undefined { return this._uri; }
    name(): string { return this._uri ? basename(this._uri.fsPath) : 'unknown'; }
    filePath(): string { return QbsUtils.fixPathSeparators(this._uri?.fsPath || ''); }

    async setData(data: QbsProjectData, withBuildSystemFiles: boolean) {
        if (!data.isEmpty()) {
            const buildSystemFiles = this._data?.buildSystemFiles();
            if (!withBuildSystemFiles) {
                data.setBuildSystemFiles(buildSystemFiles);
            }
            this._data = data;
        }
    }

    data(): QbsProjectData | undefined { return this._data; }
    setRunEnvironment(env: QbsRunEnvironmentData) { this._runStep.setup(undefined, undefined, env); }
    buildStep(): QbsBuildStep { return this._buildStep; }
    runStep(): QbsRunStep { return this._runStep; }
    isEmpty(): boolean { return this._data ? true : false; }
    products(): QbsProductData[] { return this._data?.products() || []; }

    async updateSteps() {
        await this._buildStep.restore();
        await this._runStep.restore();
    }

    async restore() {
        await this._buildStep.restore();
        await new Promise<void>(resolve => {
            const projectResolvedSubscription = this.session().onProjectResolved(async () => {
                await this.updateSteps();
                await projectResolvedSubscription.dispose();
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
