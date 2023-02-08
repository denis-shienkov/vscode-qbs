import * as cp from 'child_process';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsOutputLogger } from './qbsoutputlogger';
import { QbsProtocolProfileData } from './protocol/qbsprotocolprofiledata';
import { QbsProtocolQbsModuleData } from './protocol/qbsprotocolqbsmoduledata';
import { QbsResult } from './qbsresult';
import { QbsSettings } from './qbssettings';
import { trimLine } from './qbsutils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsBuildProfileManager implements vscode.Disposable {
    private static instance: QbsBuildProfileManager;
    private profiles: QbsProtocolProfileData[] = [];
    private defaultProfileName: string = '';
    private updated: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private profileSelected: vscode.EventEmitter<QbsProtocolProfileData | undefined>
        = new vscode.EventEmitter<QbsProtocolProfileData | undefined>();

    readonly onUpdated: vscode.Event<void> = this.updated.event;
    readonly onProfileSelected: vscode.Event<QbsProtocolProfileData | undefined> = this.profileSelected.event;

    public static getInstance(): QbsBuildProfileManager { return QbsBuildProfileManager.instance; }

    public constructor(context: vscode.ExtensionContext) {
        QbsBuildProfileManager.instance = this;

        // Register the commands related to the profile manager.
        this.registerCommandsHandlers(context);
    }

    public dispose(): void { }

    public getDefaultProfileName(): string { return this.defaultProfileName; }
    public getAllProfiles(): QbsProtocolProfileData[] { return this.profiles; }

    public findProfile(profileName?: string): QbsProtocolProfileData | undefined {
        return this.getAllProfiles().find(profile => profile.getName() === profileName);
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ScanBuildProfiles, async () => {
            await this.scanProfilesWithProgress();
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectBuildProfile, async () => {
            await this.selectProfile();
        }));
    }

    private async selectProfile(): Promise<void> {
        interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
            profile?: QbsProtocolProfileData;
            isDefault?: boolean;
        }
        const items: QbsProfileQuickPickItem[] = [
            ...[
                {
                    label: localize('qbs.buildprofilemanager.scan.select.label', '[Scan build profiles]'),
                    description: localize('qbs.buildprofilemanager.scan.select.description', 'Scan available build profiles'),
                    profile: undefined
                },
                {
                    label: localize('qbs.buildprofilemanager.default.select.label', 'Default'),
                    description: localize('qbs.buildprofilemanager.default.select.description',
                        'Default profile "{0}"', this.defaultProfileName),
                    profile: undefined,
                    isDefault: true
                }
            ],
            ...this.profiles.map((profile) => {
                const label = profile.getName();
                const description = this.getProfileDescription(profile);
                return { label, description, profile };
            })
        ];

        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) // Choose was canceled by the user.
            return;
        else if (!chosen.profile && !chosen.isDefault) // Scan profiles item was choosed by the user.
            await this.scanProfilesWithProgress();
        else // Profile was choosed by the user (or default or selected).
            this.profileSelected.fire(chosen.profile);
    }

    private async scanProfilesWithProgress(): Promise<void> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildprofilemanager.scan.progress.title', 'Scanning build profiles')
        }, async (progress) => {
            return new Promise<void>(async (resolve) => {
                return await this.scanProfiles().then((result) => {
                    progress.report({
                        increment: 100,
                        message: (result.success)
                            ? localize('qbs.buildprofilemanager.scan.progress.completed.message',
                                'Successfully completed')
                            : localize('qbs.buildprofilemanager.scan.progress.failed.message',
                                'Failed with an error: {0}', result.message)
                    });
                    setTimeout(() => { resolve(); }, 3000);
                });
            });
        });
    }

    private async scanProfiles(): Promise<QbsResult<void, string>> {
        QbsOutputLogger.getInstance().logOutput(localize('qbs.buildprofilemanager.scan.log.started',
            'Starting build profiles scanning...'));
        return await this.detectProfiles().then((result) => {
            if (!result.success)
                return result;
            return this.fillProfiles();
        }).then((result) => {
            QbsOutputLogger.getInstance().logOutput(localize('qbs.buildprofilemanager.scan.log.finished',
                'Build profiles scanning finished.'));
            return result;
        });
    }

    /** Detects the all available profiles and returns an error string,
     * if an error occurred or returns an undefinad */
    private async detectProfiles(): Promise<QbsResult<void, string>> {
        return new Promise(async (resolve) => {
            const shell = this.getDetectToolchainsShell();
            const process = cp.exec(shell, (error) => {
                resolve(error ? QbsResult.Error(error.message) : QbsResult.Ok(undefined));
            });
            process.stdout?.on('data', (data) => {
                const lines = this.getLinesFrom(data);
                lines.forEach(line => { QbsOutputLogger.getInstance().logOutput(`\t${line}`); });
            });
        });
    }

    private async fillProfiles(): Promise<QbsResult<void, string>> {
        return new Promise<QbsResult<void, string>>(async (resolve) => {
            const shell = this.getListToolchainsShell();
            let lines: string[] = [];
            const process = cp.exec(shell, (error) => {
                resolve(error ? QbsResult.Error(error.message) : QbsResult.Ok(undefined));
                this.parseResultingLines(lines);
            });
            process.stdout?.on('data', (data) => {
                lines = lines.concat(this.getLinesFrom(data));
            });
        }).then(async (result) => {
            this.updated.fire();
            return result;
        });
    }

    private parseResultingLines(lines: string[]): void {
        let defaultProfileName: string = '';
        let profiles: QbsProtocolProfileData[] = [];

        // Temporary properties.
        let profileData: any = {};
        let profileName: string = '';

        lines.forEach(line => {
            if (!defaultProfileName) {
                const matches = /^defaultProfile:\s\"(.+)\"$/.exec(line);
                if (matches) {
                    defaultProfileName = matches[1];
                    return;
                }
            }

            const matches = /^profiles.(.+):\s(.+)$/.exec(line);
            if (matches) {
                // Builds the data map in a backwards order from the path parts array.
                const createData = (parts: any): any => {
                    let count = parts.length;
                    let data: any = {};
                    while (--count > 0) {
                        let tmp: any = {};
                        tmp[parts[count]] = ((count + 1) === parts.length) ? value : data;
                        data = tmp;
                    }
                    return data;
                }
                // Merges two datas into one data, with keeping a keys.
                const mergeData = (a: any, b: any) =>
                    [...Object.keys(a), ...Object.keys(b)].reduce((combined: any, key) => {
                        const ak = a[key];
                        const bk = b[key];
                        if (typeof ak === 'string')
                            combined[key] = ak;
                        else if (typeof bk === 'string')
                            combined[key] = bk;
                        else
                            combined[key] = { ...ak, ...bk };
                        return combined;
                    }, {});

                const path = matches[1];
                const value = matches[2];
                const parts = path.split('.');
                if (parts && (parts.length > 1)) {
                    const name = parts[0];
                    if (name !== profileName) {
                        // New profile started, commit the current profile.
                        if (profileName)
                            profiles.push(new QbsProtocolProfileData(profileName, profileData));
                        // Prepare to fill the new profile.
                        profileName = name;
                        const data = createData(parts);
                        profileData = mergeData({}, data);
                    } else {
                        const data = createData(parts);
                        profileData = mergeData(profileData, data);
                    }
                } else if (parts && (parts.length === 1)) {
                    // E.g. for an empty profiles, created as `qbs-config profiles.empty undefined`,
                    // and listed with `qbs-config --list` as:
                    // ...
                    // profiles.empty: undefined
                    // ...
                    const name = parts[0];
                    if (name !== profileName) {
                        // New profile started, commit the current profile.
                        if (profileName)
                            profiles.push(new QbsProtocolProfileData(profileName, profileData));
                        profileName = name;
                        profileData = value;
                    }
                }
            }
        });
        // Commit the last profile.
        if (profileName)
            profiles.push(new QbsProtocolProfileData(profileName, profileData));

        this.defaultProfileName = defaultProfileName;
        this.profiles = profiles;
    }

    private getDetectToolchainsShell(): string {
        return `"${QbsSettings.getQbsPath()}" setup-toolchains --detect ${this.getSetitngsShell()}`;
    }

    private getListToolchainsShell(): string {
        return `"${QbsSettings.getQbsPath()}" config --list ${this.getSetitngsShell()}`;
    }

    private getSetitngsShell(): string {
        const directory = QbsSettings.getSettingsDirectory();
        return directory ? ` --settings-dir "${directory}"` : '';
    }

    private getLinesFrom(data: any): string[] {
        return String(data).split(/\r?\n/).filter(line => line).map(line => trimLine(line));
    }

    private getProfileDescription(profile?: QbsProtocolProfileData): string {
        const qbsProps = profile?.getQbs();
        if (qbsProps) {
            const arch = qbsProps?.getArchitecture() || localize('qbs.buildprofile.unknown', 'unknown');
            const type = qbsProps?.getToolchainType() || localize('qbs.buildprofile.unknown', 'unknown');
            if (arch && type) {
                return localize('qbs.buildprofilemanager.select.description1',
                    'Architecture "{0}", type "{1}"', arch, type);
            }
        } else {
            const name = profile?.getBaseProfileName();
            if (name) {
                return localize('qbs.buildprofilemanager.select.description2',
                    'Base profile "{0}"', name);
            }

        }
        return '';
    }
}
