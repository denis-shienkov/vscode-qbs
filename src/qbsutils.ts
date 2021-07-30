/**
 * @file This file contains a set of useful helper functions.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function fixPathSeparators(path: string): string {
    return path.replace(/\\/g, '/');
}

/**
 * Adds the quotes to the specified @c shell path and returns
 * the resulting string.
 */
export function escapeShell(shell: string): string {
    if (shell == '') {
        return '""';
    }
    if (/[^\w@%\-+=:,./|]/.test(shell)) {
        shell = shell.replace(/"/g, '\\"');
        return `"${shell}"`;
    }
    return shell;
}

export function setContextValue(key: string, value: any): Thenable<void> {
    return vscode.commands.executeCommand('setContext', key, value);
}

export function trimLine(line: string): string {
    return line.replace(/[\n\r]/g, '');
}

export function strikeLine(text: string, canStrike = (char: string) => true): string {
    return text.split('')
        .map(char => canStrike(char) ? char + '\u0336' : char)
        .join('')
}

export function isChildOf(filePath: string, parentDirectory: string) {
    const relative = path.relative(parentDirectory, filePath);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function ensureDirectoryExistence(filePath: string) {
    var directory = path.dirname(filePath);
    if (fs.existsSync(directory))
        return;
    ensureDirectoryExistence(directory);
    fs.mkdirSync(directory);
}

export function ensureFileCreated(filePath: string, callback?: (ws: fs.WriteStream) => boolean) {
    if (!fs.existsSync(filePath)) {
        ensureDirectoryExistence(filePath);
        const ws = fs.createWriteStream(filePath);
        if (callback)
            callback(ws);
        ws.close();
    }
}

export function msToTime(msecs: number): string {
    function addZ(n: number): string {
        return (n < 10? '0' : '') + n;
    }

    let s = Math.round(msecs);
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
  
    return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs) + "." + ms;
  }

export function writeDefaultConfigurations(ws: fs.WriteStream): boolean {
    ws.write("[\n");
    ws.write("    {\n");
    ws.write("        \"name\": \"release\",\n");
    ws.write("        \"display-name\": \"Release\",\n");
    ws.write("        \"description\": \"Enable optimizations.\",\n");
    ws.write("        \"overridden-properties\": {}\n");
    ws.write("    },\n");
    ws.write("    {\n");
    ws.write("        \"name\": \"debug\",\n");
    ws.write("        \"display-name\": \"Debug\",\n");
    ws.write("        \"description\": \"Disable optimizations.\",\n");
    ws.write("        \"overridden-properties\": {}\n");
    ws.write("    },\n");
    ws.write("    {\n");
    ws.write("        \"name\": \"profiling\",\n");
    ws.write("        \"display-name\": \"Profiling\",\n");
    ws.write("        \"description\": \"Enable profiling.\",\n");
    ws.write("        \"overridden-properties\": {}\n");
    ws.write("    }\n");
    ws.write("]\n");
    return true;
}
