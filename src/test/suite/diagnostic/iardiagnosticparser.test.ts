import { expect } from 'chai';
import * as vscode from 'vscode';

import { QbsIarDiagnosticParser } from '../../../diagnostic/qbsiardiagnosticparser';
import { QbsToolchain } from '../../../protocol/qbsprotocolqbsmoduledata';

suite('IAR EW Diagnostic Parser', () => {

    test('Parsing compiler warning single description without details', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            '"c:\\foo\\bar\\bar.c",147 Warning[Pe223]:',
            '          some warning'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\\bar\\bar.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('some warning');
        expect(diagnostic.code).to.eq('Pe223');
        expect(diagnostic.range.start.line).to.eq(146);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(146);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler warning multi description without details', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            '"c:\\foo\\bar\\bar.c",147 Warning[Pe223]:',
            '          some warning',
            '          , next text'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\\bar\\bar.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('some warning, next text');
        expect(diagnostic.code).to.eq('Pe223');
        expect(diagnostic.range.start.line).to.eq(146);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(146);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error single description without details', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            '"c:\\foo\\bar\\bar.c",147 Error[Pe223]:',
            '          some error'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\\bar\\bar.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq('Pe223');
        expect(diagnostic.range.start.line).to.eq(146);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(146);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error multi description without details', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            '"c:\\foo\\bar\\bar.c",147 Error[Pe223]:',
            '          some error',
            '          , next text'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:\\foo\\bar\\bar.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error, next text');
        expect(diagnostic.code).to.eq('Pe223');
        expect(diagnostic.range.start.line).to.eq(146);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(146);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker error', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = ['Error[e46]: some error'];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq('e46');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker error at end of source', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = ['At end of source Error[Pe040]: some error'];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error');
        expect(diagnostic.code).to.eq('Pe040');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing linker multi line error', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            'Error[Li005]: some error [referenced from c:\\fo',
            '         o\\bar\\mai',
            '         n.c.o',
            ']'
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
        expect(diagnostic.source).to.eq(QbsToolchain.Iar);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('some error [referenced from c:\\foo\\bar\\main.c.o]');
        expect(diagnostic.code).to.eq('Li005');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing two linker multi line errors', () => {
        const parser = new QbsIarDiagnosticParser();
        const lines = [
            'Error[Li005]: no definition for "xyz" [referenced from c:\\foo\\bar',
            '          \\baz\\zap\\3a52',
            '          ce780950d4d9\\main.c.o]',
            'Error[Li005]: no definition for "__write" [referenced from',
            '          putchar.o(dl7M_tln.a)]'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(2);
        {
            const collection = collections[0];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Iar);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('no definition for "xyz" [referenced from c:\\foo\\bar\\baz\\zap\\3a52ce780950d4d9\\main.c.o]');
            expect(diagnostic.code).to.eq('Li005');
            expect(diagnostic.range.start.line).to.eq(0);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(0);
            expect(diagnostic.range.end.character).to.eq(0);
        }
        {
            const collection = collections[1];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Iar);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('no definition for "__write" [referenced fromputchar.o(dl7M_tln.a)]'); // TODO: How to add space 'from putchar'?
            expect(diagnostic.code).to.eq('Li005');
            expect(diagnostic.range.start.line).to.eq(0);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(0);
            expect(diagnostic.range.end.character).to.eq(0);
        }



        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

});
