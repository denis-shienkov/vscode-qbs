import * as vscode from 'vscode';
import * as fs from 'fs';

import * as QbsConfig from './qbsconfig';

export class QbsDebugger {
    constructor(readonly _data: any) {
    }

    name(): string {
        return this._data['name'];
    }

    data(): vscode.DebugConfiguration {
        return this._data;
    }

    /**
     * Returns the list of all available debug configurations
     * stored in the 'launch.json' files.
     */
    static async enumerateDebuggers(): Promise<QbsDebugger[]> {
        return new Promise<QbsDebugger[]>((resolve, reject) => {
            const filePath = QbsConfig.fetchLaunchFilePath();
            fs.readFile(filePath, (error, data) => {
                let debuggers: QbsDebugger[] = [];
                try {
                    const json = JSON.parse(data.toString());
                    const configurations = (json['configurations'] || []);
                    for (const configuration of configurations) {
                        debuggers.push(new QbsDebugger(configuration));
                    }
                } catch (e) {
                }
                resolve(debuggers);
            });
        });
    }
}
