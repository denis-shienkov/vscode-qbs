import { basename } from 'path';
import * as chokidar from 'chokidar';
import * as vscode from 'vscode';

import { isChildOf } from './qbsutils';
import { QbsBuildSystem } from './qbsbuildsystem';
import { QbsBuildSystemTimeout } from './qbsbuildsystem';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsProtocolProductData } from './protocol/qbsprotocolproductdata';
import { QbsProtocolProjectData } from './protocol/qbsprotocolprojectdata';

export class QbsProject implements vscode.Disposable {
    private projectData?: QbsProtocolProjectData; // Fills from the resolve or build stage.
    private buildSystemFilesWatcher?: QbsBuildSystemFilesWatcher;

    private profileName?: string;
    private configurationName?: string;
    private buildProductName?: string;
    private launchProductName?: string;
    private debuggerName?: string;

    private readonly projectDataChanged: vscode.EventEmitter<QbsProtocolProjectData | undefined>
        = new vscode.EventEmitter<QbsProtocolProjectData | undefined>();

    private readonly profileNameChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    private readonly configurationNameChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    private readonly buildProductNameChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    private readonly launchProductNameChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    private readonly debuggerNameChanged: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

    public readonly onProjectDataChanged: vscode.Event<QbsProtocolProjectData | undefined> = this.projectDataChanged.event;
    public readonly onProfileNameChanged: vscode.Event<string | undefined> = this.profileNameChanged.event;
    public readonly onConfigurationNameChanged: vscode.Event<string | undefined> = this.configurationNameChanged.event;
    public readonly onBuildProductNameChanged: vscode.Event<string | undefined> = this.buildProductNameChanged.event;
    public readonly onLaunchProductNameChanged: vscode.Event<string | undefined> = this.launchProductNameChanged.event;
    public readonly onDebuggerNameChanged: vscode.Event<string | undefined> = this.debuggerNameChanged.event;

    public constructor(private readonly fsPath: string) { }

    public dispose() { this.buildSystemFilesWatcher?.dispose(); }

    public getFsPath(): string { return this.fsPath; }
    public getName(): string { return basename(this.fsPath); }
    public getProjectData(): QbsProtocolProjectData | undefined { return this.projectData; }

    public getBuildProductName(): string | undefined { return this.buildProductName; }
    public getConfigurationName(): string | undefined { return this.configurationName; }
    public getDebuggerName(): string | undefined { return this.debuggerName; }
    public getLaunchProductName(): string | undefined { return this.launchProductName; }
    public getProfileName(): string | undefined { return this.profileName; }

    /** Returns the product by the name @c productName if it is found, or returns an undefined. */
    public findProduct(productName?: string): QbsProtocolProductData | undefined {
        const all = this.getAllRecursiveProducts();
        return all.find(product => {
            return (product.getFullDisplayName() === productName);
        });
    }

    public getProducts(): QbsProtocolProductData[] {
        return this.projectData?.getProducts() || [];
    }

    public getAllRecursiveProducts(): QbsProtocolProductData[] {
        return this.projectData?.getAllRecursiveProducts() || [];
    }

    public setProjectData(fromResolve: boolean, projectData?: QbsProtocolProjectData): void {
        console.log("Set project data: " + (!projectData?.getIsEmpty()) + " from resolve request: " + fromResolve);
        if (!projectData || projectData.getIsEmpty()) {
            return;
        } else if (!fromResolve) {
            // The project data from the build state may not contain some fields (e.g. profile,
            // build system files, build directory, etc.), so we have to set these fields manually.
            const files = this.projectData?.getBuildSystemFiles();
            projectData.setBuildSystemFiles(files);
            const profile = this.projectData?.getProfile();
            projectData.setProfile(profile);
            const buildDirectory = this.projectData?.getBuildDirectory();
            projectData.setBuildDirectory(buildDirectory);
        } else {
            // We need to create the watchers only once when the `resolve` command
            // completes. Otherwise the project data can not contains the build
            // directory, and other properties.
            this.buildSystemFilesWatcher = new QbsBuildSystemFilesWatcher(projectData);
        }

        this.projectData = projectData;
        this.projectDataChanged.fire(this.projectData);
    }

    public setProfileName(profileName?: string): void {
        this.profileName = profileName;
        this.profileNameChanged.fire(this.profileName);
        vscode.commands.executeCommand(QbsCommandKey.SaveProject);
        QbsBuildSystem.getInstance().delayAutoResolve(QbsBuildSystemTimeout.AutoResolve);
    }

    public setConfigurationName(configurationName?: string): void {
        this.configurationName = configurationName;
        this.configurationNameChanged.fire(this.configurationName);
        vscode.commands.executeCommand(QbsCommandKey.SaveProject);
        QbsBuildSystem.getInstance().delayAutoResolve(QbsBuildSystemTimeout.AutoResolve);
    }

    public setBuildProductName(buildProductName?: string): void {
        this.buildProductName = buildProductName;
        this.buildProductNameChanged.fire(this.buildProductName);
        vscode.commands.executeCommand(QbsCommandKey.SaveProject);
    }

    public setLaunchProductName(launchProductName?: string): void {
        this.launchProductName = launchProductName;
        this.launchProductNameChanged.fire(this.launchProductName);
        vscode.commands.executeCommand(QbsCommandKey.SaveProject);
    }

    public setDebuggerName(debuggerName?: string): void {
        this.debuggerName = debuggerName;
        this.debuggerNameChanged.fire(this.debuggerName);
        vscode.commands.executeCommand(QbsCommandKey.SaveProject);
    }
}

class QbsBuildSystemFilesWatcher implements vscode.Disposable {
    private fsWatcher?: chokidar.FSWatcher;

    public constructor(projectData: QbsProtocolProjectData) {
        const buildDirectory = projectData.getBuildDirectory();
        const fsPaths = projectData.getBuildSystemFiles().filter(file => {
            return buildDirectory && !isChildOf(file, buildDirectory)
        });
        if (fsPaths) {
            this.fsWatcher = chokidar.watch(fsPaths, { ignoreInitial: true });
            this.fsWatcher.on('change', async () => {
                QbsBuildSystem.getInstance().delayAutoResolve(QbsBuildSystemTimeout.AutoResolve);
            });
        }
    }

    public dispose() { this.fsWatcher?.close(); }
}
