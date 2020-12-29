import * as vscode from 'vscode';

import {QbsDiagnosticParser} from './qbsdiagnosticutils';
import {QbsOperationType, QbsOperationStatus} from '../datatypes/qbsoperation';
import {QbsSession} from '../qbssession';

// Toolchain output parsers.
import {QbsClangDiagnosticParser} from './qbsclangdiagnosticparser';
import {QbsGccDiagnosticParser} from './qbsgccdiagnosticparser';
import {QbsIarDiagnosticParser} from './qbsiardiagnosticparser';
import {QbsKeilDiagnosticParser} from './qbskeildiagnosticparser';
import {QbsMsvcDiagnosticParser} from './qbsmsvcdiagnosticparser';
import {QbsSdccDiagnosticParser} from './qbssdccdiagnosticparser';

// Qbs output parser.
import {QbsQbsDiagnosticParser} from './qbsqbsdiagnosticparser';

export class QbsDiagnostic implements vscode.Disposable {
    private _toolchainCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('qbs-build-diags');
    private _toolchainParser?: QbsDiagnosticParser;
    private _toolchainType: string = '';

    private _qbsCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('qbs-resolve-diags');
    private _qbsParser: QbsQbsDiagnosticParser = new QbsQbsDiagnosticParser();

    constructor (session: QbsSession) {
        session.onOperationChanged(async (operation) => {
            if (operation._type === QbsOperationType.Build) {
                if (operation._status === QbsOperationStatus.Started) {
                    this._toolchainCollection.clear();
                    this.createToolchainParser(this._toolchainType);
                } else {
                    // Set the toolchain messages collection.
                    const filePaths = this._toolchainParser?.filePaths() || [];
                    for (const filePath of filePaths) {
                        const diagnostics = this._toolchainParser?.diagnosticsAt(filePath);
                        this._toolchainCollection.set(vscode.Uri.file(filePath), diagnostics);
                    }
                    this._toolchainParser?.cleanup();
                }
            } else if (operation._type === QbsOperationType.Resolve) {
                if (operation._status === QbsOperationStatus.Started) {
                    this._qbsCollection.clear();
                } else {
                    // Set the qbs messages collection.
                    const filePaths = this._qbsParser?.filePaths() || [];
                    for (const filePath of filePaths) {
                        const diagnostics = this._qbsParser?.diagnosticsAt(filePath);
                        this._qbsCollection.set(vscode.Uri.file(filePath), diagnostics);
                    }
                    this._qbsParser.cleanup();
                }
            }
        });

        session.onProjectResolved(async (result) => {
            const profile = session.project()?.data()?.profile();
            if (profile && profile.isValid()) {
                this._toolchainType = profile.qbs().toolchainType();
            }
        });

        session.onProcessResultReceived(async (result) => {
            const hasOutput = result._stdOutput.length || result._stdError.length;
            if (result._success && !hasOutput) {
                return;
            }

            if (result._stdError.length) {
                this._toolchainParser?.parseLines(result._stdError);
            }
            if (result._stdOutput.length) {
                this._toolchainParser?.parseLines(result._stdOutput);
            }
        });

        session.onWarningMessageReceived(async (result) => {
            this._qbsParser.parseMessages(result._messages);
        });
    }

    dispose() {
        this._toolchainCollection.dispose();
        this._qbsCollection.dispose();
    }

    private createToolchainParser(toolchainType: string) {
        if (toolchainType === 'msvc') {
            this._toolchainParser = new QbsMsvcDiagnosticParser(toolchainType);
        } else if (toolchainType === 'clang-cl') {
            this._toolchainParser = new QbsClangDiagnosticParser(toolchainType);
        } else if (toolchainType === 'gcc' || toolchainType === 'mingw') {
            this._toolchainParser = new QbsGccDiagnosticParser(toolchainType);
        } else if (toolchainType === 'sdcc') {
            this._toolchainParser = new QbsSdccDiagnosticParser(toolchainType);
        } else if (toolchainType === 'iar') {
            this._toolchainParser = new QbsIarDiagnosticParser(toolchainType);
        } else if (toolchainType === 'keil') {
            this._toolchainParser = new QbsKeilDiagnosticParser(toolchainType);
        }  else {
            this._toolchainParser = undefined;
        }
    }
}
