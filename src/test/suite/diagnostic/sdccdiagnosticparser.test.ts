import { expect } from 'chai';
import * as vscode from 'vscode';

import { QbsSdccDiagnosticParser } from '../../../diagnostic/qbssdccdiagnosticparser';
import { QbsToolchain } from '../../../protocol/qbsprotocolqbsmoduledata';

suite('SDCC Diagnostic Parser', () => {

    test('Parsing compiler warning without column with code', () => {
        const parser = new QbsSdccDiagnosticParser();
        const lines = [
            'C:/foo/bar/baz/main.c:9: warning 93: some warning'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:/foo/bar/baz/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('some warning');
        expect(diagnostic.code).to.eq('93');
        expect(diagnostic.range.start.line).to.eq(8);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(8);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error without column with code', () => {
        const parser = new QbsSdccDiagnosticParser();
        const lines = [
            'C:/foo/bar/baz/main.c:9: error 101: too many parameters'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:/foo/bar/baz/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('too many parameters');
        expect(diagnostic.code).to.eq('101');
        expect(diagnostic.range.start.line).to.eq(8);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(8);
        expect(diagnostic.range.end.character).to.eq(999);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing compiler error with column without code', () => {
        const parser = new QbsSdccDiagnosticParser();
        const lines = [
            'C:/foo/bar/baz/xyz/main.c:1:19: fatal error: main3.h: No such file or directory'
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(1);
        const collection = collections[0];
        const uri = collection[0];
        expect(uri.toString()).to.eq(vscode.Uri.file('C:/foo/bar/baz/xyz/main.c').toString());
        const diagnostics = collection[1];
        expect(diagnostics.length).to.eq(1);
        const diagnostic = diagnostics[0];
        expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
        expect(diagnostic.message).to.eq('main3.h: No such file or directory');
        expect(diagnostic.code).to.eq(undefined);
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(18);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(18);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing AS linker warning', () => {
        const parser = new QbsSdccDiagnosticParser();
        const lines = [
            '?ASlink-Warning-Undefined Global \'_putchar\' referenced by module \'vprintf\''
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
        expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
        expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Warning);
        expect(diagnostic.message).to.eq('Undefined Global \'_putchar\' referenced by module \'vprintf\'');
        expect(diagnostic.range.start.line).to.eq(0);
        expect(diagnostic.range.start.character).to.eq(0);
        expect(diagnostic.range.end.line).to.eq(0);
        expect(diagnostic.range.end.character).to.eq(0);

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

    test('Parsing two compiler errors', () => {
        const parser = new QbsSdccDiagnosticParser();
        const lines = [
            'C:/foo/bar/baz/main.c:9: error 101: too many parameters',
            'D:/xyz/main.c:999: error 123: too many options',
        ];
        parser.parseLines(lines);

        const collections = parser.getDiagnostics();
        expect(collections.length).to.eq(2);
        {
            const collection = collections[0];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('C:/foo/bar/baz/main.c').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('too many parameters');
            expect(diagnostic.code).to.eq('101');
            expect(diagnostic.range.start.line).to.eq(8);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(8);
            expect(diagnostic.range.end.character).to.eq(999);
        }
        {
            const collection = collections[1];
            const uri = collection[0];
            expect(uri.toString()).to.eq(vscode.Uri.file('D:/xyz/main.c').toString());
            const diagnostics = collection[1];
            expect(diagnostics.length).to.eq(1);

            const diagnostic = diagnostics[0];
            expect(diagnostic.source).to.eq(QbsToolchain.Sdcc);
            expect(diagnostic.severity).to.eq(vscode.DiagnosticSeverity.Error);
            expect(diagnostic.message).to.eq('too many options');
            expect(diagnostic.code).to.eq('123');
            expect(diagnostic.range.start.line).to.eq(998);
            expect(diagnostic.range.start.character).to.eq(0);
            expect(diagnostic.range.end.line).to.eq(998);
            expect(diagnostic.range.end.character).to.eq(999);
        }

        parser.clearDiagnistics();
        expect(parser.getDiagnostics().length).to.eq(0);
    });

});
