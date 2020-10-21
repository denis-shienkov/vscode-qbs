/**
 * @file This file contains a set of useful helper functions.
 */

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
