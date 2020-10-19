import * as vscode from 'vscode';
import { basename } from 'path';
import * as QbsUtils from './qbsutils';
import {QbsProduct} from './qbsproduct';

interface ProductQuickPickItem extends vscode.QuickPickItem {
    product: QbsProduct;
}

export class QbsProject {
    private _uri?: vscode.Uri;
    private _data?: any;

    constructor (uri?: vscode.Uri) {
        this._uri = uri;
    }

    name(): string | undefined {
        return this._uri ? basename(this._uri.fsPath) : undefined;
    }

    filePath(): string | undefined {
        return QbsUtils.expandPath(this._uri?.fsPath);
    }

    setData(response: any, withBuildSystemFiles: boolean) {
        const data = response['project-data'];
        if (data) {
            this._data = data;
            if (!withBuildSystemFiles) {
                this._data['build-system-files'] = data['build-system-files'];
            }
        }
    }

    data(): any | undefined {
        return this._data;
    }

    async products(): Promise<QbsProduct[]> {
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

    isEmpty(): boolean {
        return this._data;
    }

    async selectBuild(): Promise<QbsProduct | undefined> {
        const products = [
            QbsProduct.createEmptyProduct()
        ].concat(await this.products());
        const items: ProductQuickPickItem[] = products.map(product => {
            return {
                label: product.isEmpty() ? '[all]' : product.fullDisplayName(),
                product: product
            };
        });
        return await vscode.window.showQuickPick(items).then(item => {
            return item?.product;
        });
    }

    async selectRun(): Promise<QbsProduct | undefined> {
        const products = (await this.products()).filter(product => product.isRunnable());
        const items: ProductQuickPickItem[] = products.map(product => {
            return {
                label: product.fullDisplayName(),
                product: product
            };
        });
        return await vscode.window.showQuickPick(items).then(item => {
            return item?.product;
        });
    }
    
    /**
     * Returns the list of paths of all found QBS project files
     * with the *.qbs extension in the current workspace directory.
     */
    static async enumerateWorkspaceProjects(): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles('*.qbs');
    }

    static async selectWorkspaceProject(): Promise<vscode.Uri | undefined> {
        interface ProjectQuickPickItem extends vscode.QuickPickItem {
            uri: vscode.Uri;
        }
        const projects = await this.enumerateWorkspaceProjects();
        const items: ProjectQuickPickItem[] = projects.map(project => {
            return {
                label: QbsUtils.fileBaseName(project),
                uri: project
            };
        });
        return await vscode.window.showQuickPick(items).then(item => {
            return item?.uri;
        });
    }
}
