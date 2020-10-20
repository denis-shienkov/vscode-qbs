import * as cp from 'child_process';
import * as QbsConfig from './qbsconfig';

export class QbsProfile {
    constructor(readonly _name: string = '') {
    }

    name(): string {
        return this._name;
    }

    /**
     * Returns the list of all available QBS build profile names.
     *
     * @note This function calls the Qbs executable and parses the output.
     */
    static async enumerateProfiles(): Promise<QbsProfile[]> {
        return new Promise<QbsProfile[]>((resolve, reject) => {
            const qbsPath = QbsConfig.fetchQbsPath();
            if (qbsPath.length === 0) {
                reject(undefined);
            } else {
                let qbsShell = `${qbsPath} config --list`;
                const qbsSettingsDirectory = QbsConfig.fetchQbsSettingsDirectory();
                if (qbsSettingsDirectory.length > 0) {
                    qbsShell += ' --settings-dir ' + qbsSettingsDirectory;
                }
                cp.exec(qbsShell, (error, stdout, stderr) => {
                    if (error) {
                        reject(undefined);
                    } else {
                        let profiles: QbsProfile[] = [];
                        stdout.split('\n').map(function (line) {
                            if (!line.startsWith('profiles'))
                                return;
                            const startIndex = line.indexOf('.');
                            if (startIndex !== -1) {
                                const endIndex = line.indexOf('.', startIndex + 1);
                                if (endIndex != -1) {
                                    const profile = new QbsProfile(line.substring(startIndex + 1, endIndex));
                                    if (profiles.map(profile => profile.name()).indexOf(profile.name()) === -1)
                                        profiles.push(profile);
                                }
                            }
                        });
                        resolve(profiles);
                    }
                });
            }
        });
    }
}
