import * as vscode from 'vscode';
import {basename} from 'path';

import * as QbsUtils from './qbsutils';

import {QbsSession} from './qbssession';

import {QbsBuildSystemFilesWatcher} from './qbsbuildsystemfileswatcher';
import {QbsBuildStep} from './steps/qbsbuildstep';
import {QbsRunStep} from './steps/qbsrunstep';

import {QbsProductData} from './datatypes/qbsproductdata';
import {QbsProjectData} from './datatypes/qbsprojectdata';

export class QbsProject implements vscode.Disposable {
    private _data?: QbsProjectData;
    private _buildStep: QbsBuildStep = new QbsBuildStep(this);
    private _runStep: QbsRunStep = new QbsRunStep(this);
    private _buildSystemFilesWatcher?: QbsBuildSystemFilesWatcher;

    constructor(private readonly _session: QbsSession, readonly _uri?: vscode.Uri) {}

    dispose() {
        this._buildStep.dispose();
        this._runStep.dispose();
        this._buildSystemFilesWatcher?.dispose();
    }

    session(): QbsSession { return this._session; }
    uri(): vscode.Uri | undefined { return this._uri; }
    name(): string { return this._uri ? basename(this._uri.fsPath) : 'unknown'; }
    filePath(): string { return QbsUtils.fixPathSeparators(this._uri?.fsPath || ''); }

    async setData(data: QbsProjectData, fromResolve: boolean)  {
        if (!data.isEmpty()) {
            const buildSystemFiles = this._data?.buildSystemFiles() || [];
            const profile = this._data?.profile();
            if (!fromResolve) {
                data.setBuildSystemFiles(buildSystemFiles);
                if (profile) {
                    data.setProfile(profile);
                }
            } else {
                // We need to create the watchers only once when the `resolve` command
                // completes. Otherwise the project data can not contains the build
                // directory, and other properties.
                this._buildSystemFilesWatcher?.dispose();
                this._buildSystemFilesWatcher = new QbsBuildSystemFilesWatcher(this._session, data);
            }
            this._data = data;
        }
    }

    data(): QbsProjectData | undefined { return this._data; }
    buildStep(): QbsBuildStep { return this._buildStep; }
    runStep(): QbsRunStep { return this._runStep; }
    isEmpty(): boolean { return this._data ? true : false; }
    products(): QbsProductData[] { return this._data?.allProducts() || []; }

    productAt(productName: string): QbsProductData | undefined {
        return this.products().find(product => product.fullDisplayName() === productName);
    }

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
