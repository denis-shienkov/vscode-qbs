import * as path from 'path';
import * as vscode from 'vscode';

import { QbsBaseNode } from './qbsbasenode';
import { QbsCommandKey } from '../datatypes/qbscommandkey';
import { QbsProjectManager } from '../qbsprojectmanager';
import { QbsProjectNode } from './qbsprojectnode';
import { QbsProtocolProjectData } from '../protocol/qbsprotocolprojectdata';
import { QbsSettings } from '../qbssettings';

class QbsProjectDataProvider implements vscode.TreeDataProvider<QbsBaseNode> {
    private projectData?: QbsProtocolProjectData;
    private readonly treeDataChanged = new vscode.EventEmitter<void>();
    private readonly resourcesPath: string

    public readonly onDidChangeTreeData: vscode.Event<void> = this.treeDataChanged.event;

    public constructor(context: vscode.ExtensionContext) {
        this.resourcesPath = path.join(context.extensionPath, 'res');
    }

    public getTreeItem(element: QbsBaseNode): vscode.TreeItem {
        return element.getTreeItem();
    }

    public getChildren(element?: QbsBaseNode): QbsBaseNode[] {
        if (element)
            return element.getChildren();
        else if (!this.projectData || this.projectData.getIsEmpty())
            return [];

        const showDisabledNodes = QbsSettings.getShowDisabledProjectItems();
        if (!showDisabledNodes && !this.projectData.getIsEnabled())
            return [];

        return [new QbsProjectNode(this.resourcesPath, showDisabledNodes, this.projectData, true)];
    }

    public refresh(projectData?: QbsProtocolProjectData) {
        if (projectData)
            this.projectData = projectData;
        this.treeDataChanged.fire();
    }
}

export class QbsProjectExplorer implements vscode.Disposable {
    private disposable?: vscode.Disposable;
    private provider: QbsProjectDataProvider = new QbsProjectDataProvider(this.context);

    public constructor(private readonly context: vscode.ExtensionContext) {
        vscode.window.registerTreeDataProvider('qbs-project', this.provider);

        this.registerCommandsHandlers(context);
        this.subscribeTreeUpdateEvents();
    }

    public async registerCommandsHandlers(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(
            QbsCommandKey.OpenTextDocumentAtPosition,
            async (uri: vscode.Uri, pos: vscode.Position) => {
                await this.openTextDocumentAtPosition(uri, pos);
            }));
    }

    private subscribeTreeUpdateEvents() {
        QbsSettings.observeSetting(QbsSettings.SettingKey.ShowDisabledProjectItems,
            () => { this.provider.refresh(); });

        QbsProjectManager.getInstance().onProjectOpen((async () => {
            this.disposable = QbsProjectManager.getInstance()
                .getProject()?.onProjectDataChanged(async (projectData) => {
                    this.provider.refresh(projectData);
                });
        }));
    }

    public dispose() { this.disposable?.dispose(); }

    private async openTextDocumentAtPosition(uri: vscode.Uri, pos: vscode.Position) {
        await vscode.workspace.openTextDocument(uri).then(async (doc) => {
            await vscode.window.showTextDocument(doc).then(async (editor) => {
                editor.selections = [new vscode.Selection(pos, pos)];
                const range = new vscode.Range(pos, pos);
                editor.revealRange(range);
            });
        });
    }
}
