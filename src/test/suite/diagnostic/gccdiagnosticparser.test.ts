import { expect } from 'chai';
import * as vscode from 'vscode';

import { QbsGccDiagnosticParser } from '../../../diagnostic/qbsgccdiagnosticparser';
import { QbsToolchain } from '../../../protocol/qbsprotocolqbsmoduledata';

suite('GCC Diagnostic Parser', () => {

    test('Parsing compiler hint', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8:9: optimized: some message'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Hint);
        expect(diagnostic.message).to.eq('some message');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(8);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler note', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8:9: note: some note'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Information);
        expect(diagnostic.message).to.eq('some note');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(8);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler warning', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8:9: warning: some warning'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('some warning');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(8);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8:9: error: some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(8);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler fatal error', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8:9: fatal error: some fatal error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some fatal error');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(8);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker error', () => {
        const parser = new QbsGccDiagnosticParser();
        const lines = [
            'c:/foo/bar/main.c:8: some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('c:/foo/bar/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Gcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(7);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(7);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

});
