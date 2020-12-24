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

export function ensureFileCreated(filePath: string) {
    if (!fs.existsSync(filePath)) {
        fs.createWriteStream(filePath).close();
    }
}
