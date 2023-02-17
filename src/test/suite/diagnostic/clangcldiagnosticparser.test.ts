import { expect } from 'chai';
import * as vscode from 'vscode';

import { QbsClangClDiagnosticParser } from '../../../diagnostic/qbsclangcldiagnosticparser';
import { QbsToolchain } from '../../../protocol/qbsprotocolqbsmoduledata';

suite('Clang-Cl Diagnostic Parser', () => {

    test('Parsing compiler warning', () => {
        const parser = new QbsClangClDiagnosticParser();
        const lines = [
            'c:\\foo\\bar\\main.c(8,13): warning: some warning'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:\\foo\\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.ClangCl);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('some warning');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(12);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(12);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error', () => {
        const parser = new QbsClangClDiagnosticParser();
        const lines = [
            'c:\\foo\\bar\\main.c(8,13): error: some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:\\foo\\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.ClangCl);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(12);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(12);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler fatal error', () => {
        const parser = new QbsClangClDiagnosticParser();
        const lines = [
            'c:\\foo\\bar\\main.c(8,13): fatal error: some fatal error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:\\foo\\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.ClangCl);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some fatal error');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(12);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(12);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker error', () => {
        const parser = new QbsClangClDiagnosticParser();
        const lines = [
            'main.c.obj : error LNK2019: some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('main.c.obj').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.ClangCl);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq('LNK2019');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker fatal error', () => {
        const parser = new QbsClangClDiagnosticParser();
        const lines = [
            'c:\\foo\\app.exe : fatal error LNK1120: 1 unresolved externals'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:\\foo\\app.exe').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.ClangCl);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('1 unresolved externals');
        expect(diagnostic.code).to.eq('LNK1120');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

});
