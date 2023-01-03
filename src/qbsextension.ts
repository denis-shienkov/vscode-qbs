import * as vscode from 'vscode';

import { QbsBuildConfigurationManager } from './qbsbuildconfigurationmanager';
import { QbsBuildProfileManager } from './qbsbuildprofilemanager';
import { QbsBuildSystem } from './qbsbuildsystem';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsCppCodeModel } from './qbscppcodemodel';
import { QbsDiagnosticManager } from './diagnostic/qbsdiagnosticmanager';
import { QbsLaunchConfigurationManager } from './qbslaunchconfigurationmanager';
import { QbsOutputLogger } from './qbsoutputlogger';
import { QbsProjectExplorer } from './projectexplorer/qbsprojectexplorer';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsStatusBar } from './qbsstatusbar';

let extensionManager: QbsExtensionManager;

class QbsExtensionManager implements vscode.Disposable {
    private readonly buildConfigurationManager: QbsBuildConfigurationManager
        = new QbsBuildConfigurationManager(this.context);
    private readonly buildProfileManager: QbsBuildProfileManager
        = new QbsBuildProfileManager(this.context);
    private readonly launchConfigurationManager: QbsLaunchConfigurationManager
        = new QbsLaunchConfigurationManager(this.context);
    private readonly buildSystem: QbsBuildSystem = new QbsBuildSystem(this.context);
    private readonly outputLogger: QbsOutputLogger = new QbsOutputLogger();
    private readonly projectManager: QbsProjectManager = new QbsProjectManager(this.context);
    private readonly cppCodeModel: QbsCppCodeModel = new QbsCppCodeModel(this.context);
    private readonly projectExplorer: QbsProjectExplorer = new QbsProjectExplorer(this.context);
    private readonly statusBar: QbsStatusBar = new QbsStatusBar();
    private readonly diagnosticManager: QbsDiagnosticManager = new QbsDiagnosticManager();

    public constructor(private readonly context: vscode.ExtensionContext) { }

    public dispose(): void {
        this.buildConfigurationManager.dispose();
        this.buildProfileManager.dispose();
        this.buildSystem.dispose();
        this.cppCodeModel.dispose();
        this.diagnosticManager.dispose();
        this.launchConfigurationManager.dispose();
        this.outputLogger.dispose();
        this.projectExplorer.dispose();
        this.projectManager.dispose();
        this.statusBar.dispose();
    }
}

function setContextValue(key: string, value: any): Thenable<void> {
    return vscode.commands.executeCommand('setContext', key, value);
}

export enum QbsExtensionKey {
    Activated = 'qbs:extension-activated',
    Id = 'qbs-community.qbs-tools',
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Extension "qbs-tools" is now active!');
    await setContextValue(QbsExtensionKey.Activated, true);
    extensionManager = new QbsExtensionManager(context);

    await vscode.commands.executeCommand(QbsCommandKey.StartupCppCodeModel);
    await vscode.commands.executeCommand(QbsCommandKey.RestartSession);
    await vscode.commands.executeCommand(QbsCommandKey.ScanBuildProfiles);
    await vscode.commands.executeCommand(QbsCommandKey.ScanBuildConfigurations);
    await vscode.commands.executeCommand(QbsCommandKey.ScanLaunchConfigurations);
    await vscode.commands.executeCommand(QbsCommandKey.RestoreProject);
}

export async function deactivate() {
    extensionManager.dispose();
}
