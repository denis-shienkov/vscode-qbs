import * as vscode from 'vscode';

import { QbsDiagnosticParser } from './qbsdiagnosticparser';
import { QbsProtocolMessageResponse } from '../protocol/qbsprotocolmessageresponse';
import { QbsProtocolProcessResponse } from '../protocol/qbsprotocolprocessresponse';
import { QbsProtocolProjectData } from '../protocol/qbsprotocolprojectdata';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';

// Toolchain output parsers (for stdout/stderr).
import { QbsClangClDiagnosticParser } from './qbsclangcldiagnosticparser';
import { QbsCosmicDiagnosticParser } from './qbscosmicdiagnosticparser';
import { QbsGccDiagnosticParser } from './qbsgccdiagnosticparser';
import { QbsIarDiagnosticParser } from './qbsiardiagnosticparser';
import { QbsKeilDiagnosticParser } from './qbskeildiagnosticparser';
import { QbsMsvcDiagnosticParser } from './qbsmsvcdiagnosticparser';
import { QbsSdccDiagnosticParser } from './qbssdccdiagnosticparser';
import { QbsWatcomDiagnosticParser } from './qbswatcomdiagnosticparser';
import { QbsClangDiagnosticParser } from './qbsclangdiagnosticparser';

// Qbs output parser (for Qbs warnings and errors).
import { QbsQbsDiagnosticParser } from './qbsqbsdiagnosticparser';

enum QbsDiagnosticCollectionId {
    Build = 'qbs-build-diagnostics',
    Resolve = 'qbs-resolve-diagnostics',
}

export class QbsDiagnosticManager implements vscode.Disposable {
    private static instance: QbsDiagnosticManager;
    private readonly toolchainCollection: vscode.DiagnosticCollection
        = vscode.languages.createDiagnosticCollection(QbsDiagnosticCollectionId.Build);
    private toolchainParser?: QbsDiagnosticParser;
    private readonly qbsCollection: vscode.DiagnosticCollection
        = vscode.languages.createDiagnosticCollection(QbsDiagnosticCollectionId.Resolve);
    private readonly qbsParser: QbsQbsDiagnosticParser = new QbsQbsDiagnosticParser();

    public static getInstance(): QbsDiagnosticManager { return QbsDiagnosticManager.instance; }

    public constructor() { QbsDiagnosticManager.instance = this; }

    public dispose(): void {
        this.toolchainCollection.dispose();
        this.qbsCollection.dispose();
    }

    public prepareToolchainDiagnostics(projectData: QbsProtocolProjectData): void {
        if (projectData.getIsEmpty())
            return;
        const toolchainType = projectData.getProfile()?.getQbs()?.getToolchainType();
        if (!toolchainType)
            return;
        this.toolchainCollection.clear();
        this.setupToolchainParser(toolchainType);
    }

    public submitToolchainDiagnostics(): void {
        const diagnostics = this.toolchainParser?.getDiagnostics();
        this.toolchainParser?.clearDiagnistics();
        if (diagnostics)
            this.toolchainCollection.set(diagnostics);
    }

    public prepareQbsDiagnostics(): void {
        this.qbsCollection.clear();
    }

    public submitQbsDiagnostics(): void {
        const diagnostics = this.qbsParser?.getDiagnostics();
        this.qbsParser.clearDiagnistics();
        this.qbsCollection.set(diagnostics);
    }

    public handleToolchainMessages(response: QbsProtocolProcessResponse): void {
        const hasOutput = response.stdOutput.length || response.stdError.length;
        if (response.success && !hasOutput)
            return;
        if (response.stdError.length)
            this.toolchainParser?.parseLines(response.stdError);
        if (response.stdOutput.length)
            this.toolchainParser?.parseLines(response.stdOutput);
    }

    public handleQbsInformationMessages(response: QbsProtocolMessageResponse): void {
        this.qbsParser.parseMessages(response.messages, vscode.DiagnosticSeverity.Information);
    }

    public handleQbsWarningMessages(response: QbsProtocolMessageResponse): void {
        this.qbsParser.parseMessages(response.messages, vscode.DiagnosticSeverity.Warning);
    }

    public handleQbsErrorMessages(response: QbsProtocolMessageResponse): void {
        this.qbsParser.parseMessages(response.messages, vscode.DiagnosticSeverity.Error);
    }

    private setupToolchainParser(toolchainType: string): void {
        if (toolchainType === QbsToolchain.Msvc)
            this.toolchainParser = new QbsMsvcDiagnosticParser();
        else if (toolchainType === QbsToolchain.Clang)
            this.toolchainParser = new QbsClangDiagnosticParser();
        else if (toolchainType === QbsToolchain.ClangCl)
            this.toolchainParser = new QbsClangClDiagnosticParser();
        else if (toolchainType === QbsToolchain.Gcc || toolchainType === QbsToolchain.MinGw)
            this.toolchainParser = new QbsGccDiagnosticParser();
        else if (toolchainType === QbsToolchain.Sdcc)
            this.toolchainParser = new QbsSdccDiagnosticParser();
        else if (toolchainType === QbsToolchain.Iar)
            this.toolchainParser = new QbsIarDiagnosticParser();
        else if (toolchainType === QbsToolchain.Keil)
            this.toolchainParser = new QbsKeilDiagnosticParser();
        else if (toolchainType === QbsToolchain.Cosmic)
            this.toolchainParser = new QbsCosmicDiagnosticParser();
        else if (toolchainType === QbsToolchain.Watcom)
            this.toolchainParser = new QbsWatcomDiagnosticParser();
        else
            this.toolchainParser = undefined;
    }
}
