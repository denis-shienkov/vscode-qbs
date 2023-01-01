import { createHash, BinaryLike } from "crypto";
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as path from 'path';
import * as vscode from 'vscode';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function getHash(input: BinaryLike) {
    const hash = createHash('sha1');
    hash.update(input);
    return hash.digest('hex');
}

export function fixFsPathSeparators(fsPath: string): string { return fsPath.replace(/\\/g, '/'); }

/** Adds the quotes to the specified @c shell path and returns the resulting string. */
export function escapeShell(shell: string): string {
    if (shell == '') {
        return '""';
    } else if (/[^\w@%\-+=:,./|]/.test(shell)) {
        shell = shell.replace(/"/g, '\\"');
        return `"${shell}"`;
    }
    return shell;
}

export function trimLine(line: string): string { return line.replace(/[\n\r]/g, ''); }

export function strikeLine(text: string, canStrike = (char: string) => true): string {
    return text.split('')
        .map(char => canStrike(char) ? char + '\u0336' : char)
        .join('')
}

export function isChildOf(fsPath: string, parentDirectory: string): boolean {
    const relative = path.relative(parentDirectory, fsPath);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function isEmpty(text?: string) { return (!text || text.length === 0); }

export function ensureDirectoryExistence(fsPath: string) {
    var directory = path.dirname(fsPath);
    if (fs.existsSync(directory))
        return;
    ensureDirectoryExistence(directory);
    fs.mkdirSync(directory);
}

export function ensureFileCreated(fsPath: string, callback?: (ws: fs.WriteStream) => boolean) {
    if (!fs.existsSync(fsPath)) {
        ensureDirectoryExistence(fsPath);
        const ws = fs.createWriteStream(fsPath);
        if (callback)
            callback(ws);
        ws.close();
    }
}

export function msToTime(msecs: number): string {
    function addZ(n: number): string {
        return (n < 10 ? '0' : '') + n;
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

export async function trySaveAll(): Promise<boolean> {
    if (await vscode.workspace.saveAll())
        return true;
    const yesButtonTitle: string = localize('qbs.yes.button.title', 'Yes');
    const chosen = await vscode.window.showErrorMessage<vscode.MessageItem>(
        localize('qbs.utils.not.saved.continue.anyway', 'Not all open documents were saved. Would you like to continue anyway?'),
        {
            title: yesButtonTitle,
            isCloseAffordance: false,
        },
        {
            title: localize('qbs.no.button.title', 'No'),
            isCloseAffordance: true,
        });
    return (chosen !== undefined) && (chosen.title === yesButtonTitle);
}

export function substractOne(num: number | string): number {
    return (typeof num === 'string') ? substractOne(parseInt(num)) : Math.max(0, num - 1);
}
