import * as vscode from 'vscode';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';
import {QbsOperationType, QbsOperationStatus} from '../datatypes/qbsoperation';
import {QbsSession} from '../qbssession';

import {QbsClangDiagnosticParser} from './qbsclangdiagnosticparser';
import {QbsGccDiagnosticParser} from './qbsgccdiagnosticparser';
import {QbsIarDiagnosticParser} from './qbsiardiagnosticparser';
import {QbsKeilDiagnosticParser} from './qbskeildiagnosticparser';
import {QbsMsvcDiagnosticParser} from './qbsmsvcdiagnosticparser';
import {QbsSdccDiagnosticParser} from './qbssdccdiagnosticparser';

export class QbsDiagnostic implements vscode.Disposable {
    private _collection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('qbs-build-diags');
    private _parser?: QbsDiagnosticParser;
    private _type: string = '';

    constructor (session: QbsSession) {
        session.onOperationChanged(async (operation) => {
            if (operation._type === QbsOperationType.Build) {
                if (operation._status === QbsOperationStatus.Started) {
                    this._collection.clear();
                    this.createParser(this._type);
                } else {
                    // Set the collection.
                    const filePaths = this._parser?.filePaths() || [];
                    for (const filePath of filePaths) {
                        const diagnostics = this._parser?.diagnosticsAt(filePath);
                        this._collection.set(vscode.Uri.file(filePath), diagnostics);
                    }
                }
            }
        });

        session.onProjectResolved(async (result) => {
            const profile = session.project()?.data()?.profile();
            if (profile && profile.isValid()) {
                this._type = profile.qbs().toolchainType();
            }
        });

        session.onProcessResultReceived(async (result) => {
            const hasOutput = result._stdOutput.length || result._stdError.length;
            if (result._success && !hasOutput) {
                return;
            }

            if (result._stdError.length) {
                this._parser?.parseLines(result._stdError);
            }
            if (result._stdOutput.length) {
                this._parser?.parseLines(result._stdOutput);
            }
        });
    }

    dispose() { this._collection.dispose(); }

    private createParser(type: string) {
        if (type === 'msvc') {
            this._parser = new QbsMsvcDiagnosticParser(type);
        } else if (type === 'clang-cl') {
            this._parser = new QbsClangDiagnosticParser(type);
        } else if (type === 'gcc' || type === 'mingw') {
            this._parser = new QbsGccDiagnosticParser(type);
        } else if (type === 'sdcc') {
            this._parser = new QbsSdccDiagnosticParser(type);
        } else if (type === 'iar') {
            this._parser = new QbsIarDiagnosticParser(type);
        } else if (type === 'keil') {
            this._parser = new QbsKeilDiagnosticParser(type);
        }  else {
            this._parser = undefined;
        }
    }
}
