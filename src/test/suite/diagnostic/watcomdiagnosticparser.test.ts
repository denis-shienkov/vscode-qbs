import { expect } from 'chai';
import * as vscode from 'vscode';

import { QbsWatcomDiagnosticParser } from '../../../diagnostic/qbswatcomdiagnosticparser';
import { QbsToolchain } from '../../../protocol/qbsprotocolqbsmoduledata';

suite('Watcom Diagnostic Parser', () => {

    test('Parsing compiler note', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'C:\\foo\bar\\main.c(9): Note! N2003: Some note'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Information);
        expect(diagnostic.message).to.eq('Some note');
        expect(diagnostic.code).to.eq('N2003');
        expect(diagnostic.range.start.line).to.eq(8);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(8);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler warning', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'C:\\foo\bar\\main.c(9): Warning! W111: Some warning'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('Some warning');
        expect(diagnostic.code).to.eq('W111');
        expect(diagnostic.range.start.line).to.eq(8);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(8);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'C:\\foo\bar\\main.c(9): Error! E1147: Some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\bar\\main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('Some error');
        expect(diagnostic.code).to.eq('E1147');
        expect(diagnostic.range.start.line).to.eq(8);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(8);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker warning', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'Warning! W1008: cannot open clib3r.lib : No such file or directory'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('cannot open clib3r.lib : No such file or directory');
        expect(diagnostic.code).to.eq('W1008');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker error', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'Error! E2028: __CHK is an undefined reference'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('__CHK is an undefined reference');
        expect(diagnostic.code).to.eq('E2028');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker details', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'file math387r.lib(ldcvt.c): undefined symbol memset_'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('file math387r.lib(ldcvt.c): undefined symbol memset_');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing two compiler errors', () => {
        const parser = new QbsWatcomDiagnosticParser();
        const lines = [
            'C:\\foo\bar\\main.c(9): Error! E1147: First error',
            'C:\\foo\bar\\baz.c(90): Error! E1063: Second error',
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(2);
        {
            const collection = collections[0];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\bar\\main.c').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('First error');
            expect(diagnostic.code).to.eq('E1147');
            expect(diagnostic.range.start.line).to.eq(8);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(8);
            expect(diagnostic.range.end.character).to.eq(999);
        }
        {
            const collection = collections[1];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\bar\\baz.c').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Watcom);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('Second error');
            expect(diagnostic.code).to.eq('E1063');
            expect(diagnostic.range.start.line).to.eq(89);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(89);
            expect(diagnostic.range.end.character).to.eq(999);
        }

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

});
