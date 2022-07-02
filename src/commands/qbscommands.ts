export * from './qbsautorestartsessioncommand';
export * from './qbsbuildcommand';
export * from './qbscancelcommand';
export * from './qbscleancommand';
export * from './qbsdebugproductcommand';
export * from './qbsdetectprofilescommand';
export * from './qbsgetbuilddirectory'
export * from './qbsgetconfigurationparams';
export * from './qbsgetrunenvironmentcommand';
export * from './qbsgetselectedproductpath';
export * from './qbsinstallcommand';
export * from './qbseditconfigurationcommand';
export * from './qbsrebuildcommand';
export * from './qbsresolvecommand';
export * from './qbsrestoreprojectcommand';
export * from './qbsrunproductcommand';
export * from './qbsselectbuildproductcommand';
export * from './qbsselectconfigurationcommand';
export * from './qbsselectdebuggercommand';
export * from './qbsselectprofilecommand';
export * from './qbsselectprojectcommand';
export * from './qbsselectrunproductcommand';
export * from './qbsstartsessioncommand';
export * from './qbsstopsessioncommand';

import * as vscode from 'vscode';
import * as QbsCommand from './qbscommands';

import {QbsCommandKey} from './qbscommandkey';

import {QbsSession} from '../qbssession';

import {QbsBuildRequest} from '../datatypes/qbsbuildrequest';
import {QbsCancelRequest} from '../datatypes/qbscancelrequest';
import {QbsCleanRequest} from '../datatypes/qbscleanrequest';
import {QbsGetRunEnvironmentRequest} from '../datatypes/qbsgetrunenvironmentrequest';
import {QbsInstallRequest} from '../datatypes/qbsinstallrequest';
import {QbsResolveRequest} from '../datatypes/qbsresolverequest';

import {QbsProductNode} from '../projectexplorer/qbsproductnode';
import {QbsProjectNode} from '../projectexplorer/qbsprojectnode';

const DEFAULT_COMMAND_TIMEOUT_MS = 5000;

export async function subscribeCommands(ctx: vscode.ExtensionContext, session: QbsSession) {
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.EditConfiguration, async () => {
        await QbsCommand.onEditConfigurationCommand(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.DetectProfiles, async () => {
        await QbsCommand.onDetectProfiles(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.RestoreProject, async () => {
        await QbsCommand.onRestoreProject(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.AutoRestartSession, async () => {
        await QbsCommand.onAutoRestartSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.StartSession, async () => {
        await QbsCommand.onStartSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.StopSession, async () => {
        await QbsCommand.onStopSession(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectProject, async () => {
        await QbsCommand.onSelectProject(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectProfile, async () => {
        await QbsCommand.onSelectProfile(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectConfiguration, async () => {
        await QbsCommand.onSelectConfiguration(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectBuild, async () => {
        await QbsCommand.onSelectBuildProduct(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectRun, async () => {
        await QbsCommand.onSelectRunProduct(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.SelectDebugger, async () => {
        await QbsCommand.onSelectDebugger(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.ResolveWithForceExecution, async () => {
        const resolveRequest = new QbsResolveRequest(session.settings());
        resolveRequest.setProjectFilePath(session.project()?.filePath() || '');
        resolveRequest.setConfigurationName(session.project()?.buildStep().configurationName() || '');
        resolveRequest.setTopLevelProfile(session.project()?.buildStep().profileName() || '');
        resolveRequest.setForceProbeExecution(true);
        await QbsCommand.onResolve(session, resolveRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Resolve, async () => {
        const resolveRequest = new QbsResolveRequest(session.settings());
        resolveRequest.setProjectFilePath(session.project()?.filePath() || '');
        resolveRequest.setConfigurationName(session.project()?.buildStep().configurationName() || '');
        resolveRequest.setOverriddenProperties(session.project()?.buildStep().configurationOverriddenProperties() )
        resolveRequest.setTopLevelProfile(session.project()?.buildStep().profileName() || '');
        await QbsCommand.onResolve(session, resolveRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Build, async () => {
        const buildRequest = new QbsBuildRequest(session.settings());
        buildRequest.setProducts([session.project()?.buildStep().productName() || '']);
        return await QbsCommand.onBuild(session, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Clean, async () => {
        const cleanRequest = new QbsCleanRequest(session.settings());
        cleanRequest.setProducts([session.project()?.buildStep().productName() || '']);
        await QbsCommand.onClean(session, cleanRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Install, async () => {
        const installRequest = new QbsInstallRequest(session.settings());
        await QbsCommand.onInstall(session, installRequest);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Rebuild, async () => {
        const products = [session.project()?.buildStep().productName() || ''];
        const cleanRequest = new QbsCleanRequest(session.settings());
        cleanRequest.setProducts(products);
        const buildRequest = new QbsBuildRequest(session.settings());
        buildRequest.setProducts(products);
        await QbsCommand.onRebuild(session, cleanRequest, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Cancel, async () => {
        const request = new QbsCancelRequest(session.settings());
        await QbsCommand.onCancel(session, request);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetRunEnvironment, async () => {
        const request = new QbsGetRunEnvironmentRequest(session.settings());
        await QbsCommand.onGetRunEnvironment(session, request);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Run, async () => {
        await QbsCommand.onRunProduct(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.Debug, async () => {
        await QbsCommand.onDebugProduct(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.BuildProduct, async (productNode: QbsProductNode) => {
        const buildRequest = new QbsBuildRequest(session.settings());
        buildRequest.setProducts([ productNode.name() ]);
        await QbsCommand.onBuild(session, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CleanProduct, async (productNode: QbsProductNode) => {
        const cleanRequest = new QbsCleanRequest(session.settings());
        cleanRequest.setProducts([ productNode.name() ]);
        await QbsCommand.onClean(session, cleanRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.BuildSubProject, async (projectNode: QbsProjectNode) => {
        const buildRequest = new QbsBuildRequest(session.settings());
        buildRequest.setProducts(projectNode.dependentProductNames());
        await QbsCommand.onBuild(session, buildRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.CleanSubProject, async (projectNode: QbsProjectNode) => {
        const cleanRequest = new QbsCleanRequest(session.settings());
        cleanRequest.setProducts(projectNode.dependentProductNames());
        await QbsCommand.onClean(session, cleanRequest, DEFAULT_COMMAND_TIMEOUT_MS);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetSelectedProductPath, async () => {
        return QbsCommand.getSelectedProductPath(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetBuildDirectory, async () => {
        return QbsCommand.getBuildDirectory(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetBuildDirectoryUnresolved, async () => {
        return QbsCommand.getBuildDirectoryUnresolved(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetProfileName, async () => {
        return QbsCommand.getProfileName(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetConfigurationName, async () => {
        return QbsCommand.getConfigurationName(session);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand(QbsCommandKey.GetCustomProperty, async (property: string) => {
        return QbsCommand.getCustomProperty(session, property);
    }))
}
