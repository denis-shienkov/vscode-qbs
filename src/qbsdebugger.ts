import * as fs from 'fs';

import * as QbsConfig from './qbsconfig';

export class QbsDebugger {
    constructor(readonly _data: any) {
    }

    name(): string {
        return 'foo';
    }

    /**
     * Returns the list of all available debug configurations
     * stored in the 'launch.json' files.
     */
    static async enumerateDebuggers(): Promise<QbsDebugger[]> {
        return new Promise<QbsDebugger[]>((resolve, reject) => {
            const filePath = QbsConfig.fetchLaunchFilePath();
            fs.readFile(filePath, (error, data) => {
                let configurations: QbsDebugger[] = [];
                try {
                    const json = JSON.parse(data.toString());
                    configurations = json['configurations'] || [];
                } catch (e) {
                }
                resolve(configurations);
            });
        });
    }
}
