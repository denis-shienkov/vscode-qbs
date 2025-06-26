import * as cp from 'child_process';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import * as path from 'path';

import { QbsAllBuildProfileFilterData, QbsSpecificBuildProfileFilterData } from './datatypes/qbsbuildprofilefilterdata';
import { QbsBuildProfileFilterKey } from './datatypes/qbsbuildprofilefilterkey';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsOutputLogger } from './qbsoutputlogger';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsProtocolProfileData } from './protocol/qbsprotocolprofiledata';
import { QbsResult } from './qbsresult';
import { QbsSettings } from './qbssettings';
import { trimLine, fixFsPathSeparators, resolveVariables, workspaceFolder } from './qbsutils';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class QbsBuildProfileManager implements vscode.Disposable {
    private static instance: QbsBuildProfileManager;
    private profiles: QbsProtocolProfileData[] = [];
    private profileFilters: QbsAllBuildProfileFilterData | undefined;
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
        
        // Initialize profile filters asynchronously
        this.refreshProfileFilters();
    }

    public dispose(): void { }

    public getDefaultProfileName(): string { return this.defaultProfileName; }
    public getAllProfiles(): QbsProtocolProfileData[] { return this.profiles; }

    public findProfile(profileName?: string): QbsProtocolProfileData | undefined {
        return this.getAllProfiles().find(profile => profile.getName() === profileName);
    }

    private registerCommandsHandlers(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ScanBuildProfiles, async () => {
            await this.scanProfilesWithProgress(); // Scan with re-detection.
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.UpdateBuildProfiles, async () => {
            await this.updateProfilesWithProgress(); // Scan without re-detection.
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ExportBuildProfiles, async () => {
            await this.exportProfilesWithDialog();
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ImportBuildProfiles, async () => {
            await this.importProfilesWithDialog();
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectBuildProfile, async () => {
            await this.selectProfile();
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CreateBuildProfilesFilter, async () => {
            await this.createBuildProfilesFilter();
        }));
        context.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.EditBuildProfilesFilter, async () => {
            await this.editBuildProfilesFilter();
        }));
    }

    private async selectProfile(): Promise<void> {
        interface QbsProfileQuickPickItem extends vscode.QuickPickItem {
            profile?: QbsProtocolProfileData;
            isDefault?: boolean;
            isToggleFilter?: boolean;
        }

        // Load profile filters if not already loaded
        if (this.profileFilters === undefined) {
            this.profileFilters = await this.readProfileFilters();
        }

        let showFilteredOnly = true; // Always start with filtered profiles

        const showProfilePicker = async (): Promise<void> => {
            // Get profiles based on current filter state
            const profilesToShow = showFilteredOnly ? this.getFilteredProfiles() : this.profiles;
            const hasFiltering = this.profileFilters && this.profileFilters.profiles && this.profileFilters.profiles.length > 0;
            const isFiltered = hasFiltering && profilesToShow.length < this.profiles.length;

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
                // Add filter toggle item if filtering is available and some profiles are filtered out
                ...(hasFiltering && isFiltered ? [{
                    label: localize('qbs.buildprofilemanager.showall.select.label', '[Show All Profiles]'),
                    description: localize('qbs.buildprofilemanager.showall.select.description', 'Show all available profiles without filtering'),
                    profile: undefined,
                    isToggleFilter: true
                }] : []),
                // Add filter toggle item if showing all profiles and filtering is available
                ...(hasFiltering && !showFilteredOnly ? [{
                    label: localize('qbs.buildprofilemanager.filter.select.label', '[Filter Profiles]'),
                    description: localize('qbs.buildprofilemanager.filter.select.description', 'Show only filtered profiles from qbs-profiles.json'),
                    profile: undefined,
                    isToggleFilter: true
                }] : []),
                ...profilesToShow.map((profile) => {
                    const label = profile.getName();
                    const description = this.getProfileDescription(profile);
                    return { label, description, profile };
                })
            ];

            const chosen = await vscode.window.showQuickPick(items);
            if (!chosen) {
                // Choose was canceled by the user.
                return;
            } else if (chosen.isToggleFilter) {
                // Toggle filter state and show picker again
                showFilteredOnly = !showFilteredOnly;
                await showProfilePicker();
            } else if (!chosen.profile && !chosen.isDefault) {
                // Scan profiles item was chosen by the user.
                await this.scanProfilesWithProgress(); // Scan with re-detection
            } else {
                // Profile was chosen by the user (or default or selected).
                this.profileSelected.fire(chosen.profile);
            }
        };

        await showProfilePicker();
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

    private async updateProfilesWithProgress(): Promise<void> {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('qbs.buildprofilemanager.update.progress.title', 'Updating build profiles')
        }, async (progress) => {
            return new Promise<void>(async (resolve) => {
                return await this.updateProfiles().then((result) => {
                    progress.report({
                        increment: 100,
                        message: (result.success)
                            ? localize('qbs.buildprofilemanager.update.progress.completed.message',
                                'Successfully completed')
                            : localize('qbs.buildprofilemanager.update.progress.failed.message',
                                'Failed with an error: {0}', result.message)
                    });
                    setTimeout(() => { resolve(); }, 1000);
                });
            });
        });
    }

    private async exportProfilesWithDialog(): Promise<void> {
        const options: vscode.OpenDialogOptions = {
            title: localize('qbs.buildprofilemanager.export.title', 'Choose file to export the build profiles'),
            openLabel: localize('qbs.buildprofilemanager.export.caption', 'Export'),
            canSelectMany: false,
        };
        return new Promise<void>(async (resolve) => {
            return await vscode.window.showSaveDialog(options).then((uri) => {
                const fsPath = uri?.fsPath;
                if (fsPath) {
                    return this.exportProfiles(fsPath).then((result) => {
                        if (result.success)
                            return vscode.window.showInformationMessage(
                                localize('qbs.buildprofilemanager.export.success',
                                    'Build profiles successfully exported to file: {0}', fsPath));
                        return vscode.window.showErrorMessage(
                            localize('qbs.buildprofilemanager.export.failed',
                                'Build profiles exporting to file: {0} failed: {1}'), fsPath, result.message);
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    private async importProfilesWithDialog(): Promise<void> {
        const options: vscode.OpenDialogOptions = {
            title: localize('qbs.buildprofilemanager.import.title', 'Choose file to import the build profiles'),
            openLabel: localize('qbs.buildprofilemanager.import.caption', 'Import'),
            canSelectMany: false,
        };
        return new Promise<void>(async (resolve) => {
            return await vscode.window.showOpenDialog(options).then((uri) => {
                const fsPaths = uri?.map(uri => uri.fsPath);
                if (fsPaths) {
                    const fsPath = fsPaths[0];
                    return this.importProfiles(fsPath).then((result) => {
                        if (result.success) {
                            this.fillProfiles().then((result) => {
                                if (result.success) {
                                    return vscode.window.showInformationMessage(
                                        localize('qbs.buildprofilemanager.import.success',
                                            'Build profiles successfully imported from file: {0}', fsPath));
                                }
                                return vscode.window.showErrorMessage(
                                    localize('qbs.buildprofilemanager.import.failed',
                                        'Build profiles importing from file: {0} failed: {1}'), fsPath, result.message);
                            });
                        } else {
                            vscode.window.showErrorMessage(
                                localize('qbs.buildprofilemanager.import.failed',
                                    'Build profiles importing from file: {0} failed: {1}'), fsPath, result.message);
                        }
                    });
                } else {
                    resolve();
                }
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

    private async updateProfiles(): Promise<QbsResult<void, string>> {
        QbsOutputLogger.getInstance().logOutput(localize('qbs.buildprofilemanager.update.log.started',
            'Starting build profiles updating...'));
        return this.fillProfiles().then((result) => {
            QbsOutputLogger.getInstance().logOutput(localize('qbs.buildprofilemanager.update.log.finished',
                'Build profiles updating finished.'));
            return result;
        });
    }

    private async exportProfiles(fsPath: string): Promise<QbsResult<void, string>> {
        return new Promise(async (resolve) => {
            const shell = this.getExportToolchainsShell(fsPath);
            const process = cp.exec(shell, (error) => {
                resolve(error ? QbsResult.Error(error.message) : QbsResult.Ok(undefined));
            });
            process.stdout?.on('data', (data) => {
                // Do nothing.
            });
        });
    }

    private async importProfiles(fsPath: string): Promise<QbsResult<void, string>> {
        return new Promise(async (resolve) => {
            const shell = this.getImportToolchainsShell(fsPath);
            const process = cp.exec(shell, (error) => {
                resolve(error ? QbsResult.Error(error.message) : QbsResult.Ok(undefined));
            });
            process.stdout?.on('data', (data) => {
                // Do nothing.
            });
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
                const matches = /^defaultProfile:\s\"(?<name>.+)\"$/.exec(line);
                if (matches) {
                    defaultProfileName = matches[1];
                    return;
                }
            }

            const matches = /^profiles.(?<path>.+):\s"(?<value>.+)"$/.exec(line)
                || /^profiles.(?<path>.+):\s(?<value>.+)$/.exec(line);
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

    /**
     * Reads the qbs-profiles.json file and returns the profile filters.
     * @returns Promise that resolves to the profile filter data or undefined if file doesn't exist or can't be read
     */
    private async readProfileFilters(): Promise<QbsAllBuildProfileFilterData | undefined> {
        const filePath = this.getProfilesFilePath();
        if (!filePath) {
            return undefined;
        }

        return new Promise<QbsAllBuildProfileFilterData | undefined>((resolve) => {
            fs.readFile(filePath, (error, data) => {
                if (error) {
                    // File doesn't exist or can't be read - this is not an error, just no filtering
                    resolve(undefined);
                } else {
                    try {
                        const content = jsonc.parse(data.toString());
                        const version = content[QbsBuildProfileFilterKey.Version] || '1';
                        const profilesArray = content[QbsBuildProfileFilterKey.Profiles] || [];
                        
                        const profiles = profilesArray
                            .filter((entry: any) => entry[QbsBuildProfileFilterKey.Name])
                            .map((entry: any) => {
                                const name = entry[QbsBuildProfileFilterKey.Name];
                                return new QbsSpecificBuildProfileFilterData(name);
                            });
                        
                        resolve(new QbsAllBuildProfileFilterData(version, profiles));
                    } catch (parseError) {
                        console.log('Error parsing qbs-profiles.json:', parseError);
                        resolve(undefined);
                    }
                }
            });
        });
    }

    /**
     * Filters the available profiles based on the profile filters from qbs-profiles.json.
     * @returns Array of filtered profiles
     */
    private getFilteredProfiles(): QbsProtocolProfileData[] {
        // If no profile filters are loaded, return all profiles
        if (!this.profileFilters || !this.profileFilters.profiles || this.profileFilters.profiles.length === 0) {
            return this.profiles;
        }

        // Create a set of allowed profile names for efficient lookup
        const allowedProfileNames = new Set(
            this.profileFilters.profiles.map(filter => filter.name)
        );

        // Return only profiles that are in the allowed list
        return this.profiles.filter(profile => allowedProfileNames.has(profile.getName()));
    }

    private getDetectToolchainsShell(): string {
        return `"${this.getQbsPath()}" setup-toolchains --detect ${this.getSettingsShell()}`;
    }

    private getListToolchainsShell(): string {
        return `"${this.getQbsPath()}" config --list ${this.getSettingsShell()}`;
    }

    private getExportToolchainsShell(fsPath: string): string {
        return `"${this.getQbsPath()}" config --export ${fsPath} ${this.getSettingsShell()}`;
    }

    private getImportToolchainsShell(fsPath: string): string {
        return `"${this.getQbsPath()}" config --import ${fsPath} ${this.getSettingsShell()}`;
    }

    private getQbsPath() : string { return resolveVariables(QbsSettings.getQbsPath()); }

    private getSettingsShell(): string {
        var directory = QbsSettings.getSettingsDirectory();
        if (directory) {
            directory = resolveVariables(directory);
            directory = fixFsPathSeparators(directory)
            directory = path.resolve(workspaceFolder(), directory);
        }
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

    /**
     * Gets the full path to the qbs-profiles.json file based on the project path.
     * Similar to QbsBuildConfigurationManager.getFullBuildConfigurationsFilePath().
     * @param fsProjectPath The file system path to the project
     * @returns The full path to the qbs-profiles.json file, or undefined if not available
     */
    private static getFullBuildProfilesFilePath(fsProjectPath: string): string | undefined {
        const sourceRoot = QbsSettings.getSourceRootDirectory(fsProjectPath);
        if (!sourceRoot) {
            vscode.window.showWarningMessage(localize('qbs.buildprofilemanager.noworkspace.message',
                'Unable get the build profiles file because no any workspace folder is open.'));
            return;
        }
        const result = QbsSettings.getBuildProfilesFilePath();
        if (!result) {
            vscode.window.showWarningMessage(localize('qbs.buildprofilemanager.nofspath.message',
                'Unable to get the build profiles file because its path is not set in Qbs extension settings.'));
            return;
        }
        return QbsSettings.substituteSourceRoot(result, sourceRoot);
    }

    /**
     * Returns the full path to the qbs-profiles.json file.
     * Similar to QbsBuildConfigurationManager.getFullBuildConfigurationsFilePath() but for profiles.
     * @returns The path to the qbs-profiles.json file, or undefined if not available.
     */
    public getProfilesFilePath(): string | undefined {
        const fsProjectPath = QbsProjectManager.getInstance().getProject()?.getFsPath();
        if (!fsProjectPath)
            return;
        return QbsBuildProfileManager.getFullBuildProfilesFilePath(fsProjectPath);
    }

    /**
     * Refreshes the profile filters by re-reading the qbs-profiles.json file.
     * This should be called when the file might have changed.
     */
    public async refreshProfileFilters(): Promise<void> {
        this.profileFilters = await this.readProfileFilters();
    }

    /**
     * Creates a new qbs-profiles.json file with all currently known profiles and opens it for editing.
     * This command allows users to easily set up a profile filter by starting with all available profiles.
     */
    public async createBuildProfilesFilter(): Promise<void> {
        try {
            const filePath = this.getProfilesFilePath();
            if (!filePath) {
                return; // Error already shown by getProfilesFilePath()
            }

            // Check if file already exists
            if (fs.existsSync(filePath)) {
                const overwrite = await vscode.window.showWarningMessage(
                    localize('qbs.buildprofilemanager.createfilter.exists.message',
                        'The file "{0}" already exists. Do you want to overwrite it?', filePath),
                    { modal: true },
                    localize('qbs.buildprofilemanager.createfilter.overwrite', 'Overwrite'),
                    localize('qbs.buildprofilemanager.createfilter.cancel', 'Cancel')
                );
                
                if (overwrite !== localize('qbs.buildprofilemanager.createfilter.overwrite', 'Overwrite')) {
                    return; // User cancelled
                }
            }

            // Create the filter data with all current profiles in the expected JSON format
            const filterData = {
                [QbsBuildProfileFilterKey.Version]: "1.0",
                [QbsBuildProfileFilterKey.Profiles]: this.profiles.map(profile => ({
                    [QbsBuildProfileFilterKey.Name]: profile.getName()
                }))
            };

            // Ensure the directory exists
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            // Write the JSON file with proper formatting
            const jsonContent = JSON.stringify(filterData, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');

            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(
                localize('qbs.buildprofilemanager.createfilter.success.message',
                    'Created build profiles filter file "{0}" with {1} profiles.', 
                    path.basename(filePath), this.profiles.length)
            );

        } catch (error) {
            const message = localize('qbs.buildprofilemanager.createfilter.error.message',
                'Failed to create build profiles filter file: {0}', error instanceof Error ? error.message : String(error));
            QbsOutputLogger.getInstance().logOutput(message);
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Opens the existing qbs-profiles.json file for editing.
     * If the file doesn't exist, offers to create it first.
     */
    public async editBuildProfilesFilter(): Promise<void> {
        try {
            const filePath = this.getProfilesFilePath();
            if (!filePath) {
                return; // Error already shown by getProfilesFilePath()
            }

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                const create = await vscode.window.showInformationMessage(
                    localize('qbs.buildprofilemanager.editfilter.notfound.message',
                        'The build profiles filter file "{0}" does not exist. Would you like to create it?', filePath),
                    localize('qbs.buildprofilemanager.editfilter.create', 'Create File'),
                    localize('qbs.buildprofilemanager.editfilter.cancel', 'Cancel')
                );
                
                if (create === localize('qbs.buildprofilemanager.editfilter.create', 'Create File')) {
                    // Create the file first
                    await this.createBuildProfilesFilter();
                }
                return;
            }

            // Open the existing file in the editor
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);

        } catch (error) {
            const message = localize('qbs.buildprofilemanager.editfilter.error.message',
                'Failed to open build profiles filter file: {0}', error instanceof Error ? error.message : String(error));
            QbsOutputLogger.getInstance().logOutput(message);
            vscode.window.showErrorMessage(message);
        }
    }
}
