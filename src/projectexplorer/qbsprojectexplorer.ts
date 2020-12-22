import * as vscode from 'vscode';

import {QbsBaseNode} from './qbsbasenode';
import {QbsProjectNode} from './qbsprojectnode';

import {QbsSession} from '../qbssession';
import {QbsSettingsEvent} from '../qbssettings';

async function openTextDocumentAtPosition(uri: vscode.Uri, pos: vscode.Position) {
    await vscode.workspace.openTextDocument(uri).then(async (doc) => {
        await vscode.window.showTextDocument(doc).then(async (editor) => {
            editor.selections = [new vscode.Selection(pos, pos)];
            const range = new vscode.Range(pos, pos);
            editor.revealRange(range);
        });
    });
}

class QbsProjectDataProvider implements vscode.TreeDataProvider<QbsBaseNode> {
    private _showDisabledNodes: boolean = false;
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;


    constructor(private readonly _session: QbsSession) {
        _session.onProjectResolved(async () => this._onDidChangeTreeData.fire());

        _session.settings().onChanged(async (event) => {
            if (event === QbsSettingsEvent.ProjectTreeUpdateRequired) {
                this._showDisabledNodes = _session.settings().showDisabledProjectItems();
                this._onDidChangeTreeData.fire();
            }
        });

        this._showDisabledNodes = _session.settings().showDisabledProjectItems();
    }

    getTreeItem(node: QbsBaseNode): vscode.TreeItem {
        return node.getTreeItem();
    }

    getChildren(node?: QbsBaseNode): QbsBaseNode[] {
        if (node) {
            return node.getChildren();
        }

        const project = this._session.project()?.data();
        if (!project) {
            return [];
        }

        if (!this._showDisabledNodes && !project.isEnabled()) {
            return [];
        }

        return [ new QbsProjectNode(project, true, this._showDisabledNodes) ];
    }
}

export class QbsProjectExplorer implements vscode.Disposable {
    private _viewer: vscode.TreeView<QbsBaseNode>;

    constructor(session: QbsSession) {
        const treeDataProvider = new QbsProjectDataProvider(session);
        this._viewer = vscode.window.createTreeView('qbs-project', {
            treeDataProvider,
            showCollapseAll: true
        });
    }

    async subscribeCommands(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(vscode.commands.registerCommand('qbs.openTextDocumentAtPosition',
            async (uri: vscode.Uri, pos: vscode.Position) => {
                await openTextDocumentAtPosition(uri, pos);
        }));
    }

    dispose() { this._viewer.dispose(); }
}
