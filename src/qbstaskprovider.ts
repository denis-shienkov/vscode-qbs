import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { QbsBuildSystem } from './qbsbuildsystem';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsProtocolMessageResponse } from './protocol/qbsprotocolmessageresponse';
import { QbsSession } from './qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

interface QbsTaskDefinition extends vscode.TaskDefinition {
    type: string;
    label: string;
    command: string;
    products?: string[];
}

enum QbsTaskCommandType {
    Build = 'build',
    Clean = 'clean',
    Install = 'install',
    Rebuild = 'rebuild',
    Resolve = 'resolve',
}

class QbsTask extends vscode.Task {
    detail?: string;
}

class QbsTaskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private readonly endOfLine: string = '\r\n';

    public constructor(private definition: vscode.TaskDefinition) {
    }

    public get onDidWrite(): vscode.Event<string> {
        return this.writeEmitter.event;
    }

    public get onDidClose(): vscode.Event<number> {
        return this.closeEmitter.event;
    }

    public async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
        switch (this.definition.command) {
            case QbsTaskCommandType.Build:
                await this.runBuildTask();
                break;
            case QbsTaskCommandType.Clean:
                await this.runCleanTask();
                break;
            case QbsTaskCommandType.Install:
                await this.runInstallTask();
                break;
            case QbsTaskCommandType.Rebuild:
                await this.runRebuildTask();
                break;
            case QbsTaskCommandType.Resolve:
                await this.runResolveTask();
                break;
            default:
                this.writeEmitter.fire(localize('qbs.taskprovider.command.not.recognized',
                    '{0} is not a recognized command.', `"${this.definition.command}"`) + this.endOfLine);
                this.closeEmitter.fire(-1);
                return;
        }
    }

    public close(): void {
        // The terminal has been closed. Shutdown the build.
    }

    private subscribeSessionMessages(session: QbsSession, operationDisposables: vscode.Disposable[]): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = [...operationDisposables];

        // Handle the command description/runenv messages from the Qbs session.
        disposables.push(session.onCommandDescriptionReceived(async (response) => this.logMessageResponse(response)));
        disposables.push(session.onRunEnvironmentResultReceived(async (response) => this.logMessageResponse(response)));

        // Handle the log/warning/error messages from the Qbs session.
        disposables.push(session.onLogMessageReceived(async (response) => this.logMessageResponse(response)));
        disposables.push(session.onWarningMessageReceived(async (response) => this.logMessageResponse(response)));
        disposables.push(session.onErrorMessageReceived(async (response) => this.logMessageResponse(response)));

        // Handle messages from the Qbs session process output (std/err).
        disposables.push(session.onProcessResultReceived(async (result) => {
            const hasOutput = result.stdOutput.length || result.stdError.length;
            if (result.success && !hasOutput)
                return;

            const shell = `${result.executable} ${result.arguments.join(' ')}`;
            this.logMessage(shell);

            const logStdMessages = (data: string[]) => {
                if (data.length) {
                    const message = data.join('\n');
                    this.logMessage(message);
                }
            }

            logStdMessages(result.stdError);
            logStdMessages(result.stdOutput);
        }));

        return disposables;
    }

    private logMessageResponse(response?: QbsProtocolMessageResponse): void {
        if (!response || response.getIsEmpty())
            return;
        const message = response.toString();
        if (!message)
            return;
        this.logMessage(message);
    }

    private logMessage(message: string): void {
        this.writeEmitter.fire(message + this.endOfLine);
    }

    private async runBuildTask(): Promise<void> {
        const session = QbsBuildSystem.getInstance().getSession();
        const disposables = this.subscribeSessionMessages(session,
            [session.onProjectBuilt(async (data) => this.logMessageResponse(data.message))]
        );

        console.log('Start build task');
        return new Promise<boolean>(async (resolve) => {
            const success = vscode.commands.executeCommand(QbsCommandKey.BuildProduct, this.definition?.products);
            resolve(success);
        }).then((result) => {
            console.log('Complete build task with result: ' + result);
            this.closeTask(result);
        }).finally(() => {
            console.log('Cleanup build task subscriptions');
            disposables.forEach((d) => d.dispose());
        });
    }

    private async runCleanTask(): Promise<void> {
        const session = QbsBuildSystem.getInstance().getSession();
        const disposables = this.subscribeSessionMessages(session,
            [session.onProjectCleaned(async (response) => this.logMessageResponse(response))]
        );

        console.log('Start clean task');
        return new Promise<boolean>(async (resolve) => {
            const success = vscode.commands.executeCommand(QbsCommandKey.CleanProduct, this.definition?.products);
            resolve(success);
        }).then((result) => {
            console.log('Complete clean task with result: ' + result);
            this.closeTask(result);
        }).finally(() => {
            console.log('Cleanup clean task subscriptions');
            disposables.forEach((d) => d.dispose());
        });
    }

    private async runInstallTask(): Promise<void> {
        const session = QbsBuildSystem.getInstance().getSession();
        const disposables = this.subscribeSessionMessages(session,
            [session.onProjectInstalled(async (response) => this.logMessageResponse(response))]
        );

        console.log('Start install task');
        return new Promise<boolean>(async (resolve) => {
            const success = vscode.commands.executeCommand(QbsCommandKey.InstallProduct, this.definition?.products);
            resolve(success);
        }).then((result) => {
            console.log('Complete install task with result: ' + result);
            this.closeTask(result);
        }).finally(() => {
            console.log('Cleanup install task subscriptions');
            disposables.forEach((d) => d.dispose());
        });
    }

    private async runRebuildTask(): Promise<void> {
        const session = QbsBuildSystem.getInstance().getSession();
        const disposables = this.subscribeSessionMessages(session,
            [
                session.onProjectCleaned(async (response) => this.logMessageResponse(response)),
                session.onProjectBuilt(async (data) => this.logMessageResponse(data.message))
            ]
        );

        console.log('Start rebuild task');
        return new Promise<boolean>(async (resolve) => {
            const success = vscode.commands.executeCommand(QbsCommandKey.RebuildProduct, this.definition?.products);
            resolve(success);
        }).then((result) => {
            console.log('Complete rebuild task with result: ' + result);
            this.closeTask(result);
        }).finally(() => {
            console.log('Cleanup rebuild task subscriptions');
            disposables.forEach((d) => d.dispose());
        });
    }

    private async runResolveTask(): Promise<void> {
        const session = QbsBuildSystem.getInstance().getSession();
        const disposables = this.subscribeSessionMessages(session,
            [session.onProjectResolved(async (data) => this.logMessageResponse(data.message))]
        );

        console.log('Start resolve task');
        return new Promise<boolean>(async (resolve) => {
            const success = vscode.commands.executeCommand(QbsCommandKey.ResolveProject, this.definition?.products);
            resolve(success);
        }).then((result) => {
            console.log('Complete resolve task with result: ' + result);
            this.closeTask(result);
        }).finally(() => {
            console.log('Cleanup resolve task subscriptions');
            disposables.forEach((d) => d.dispose());
        });
    }

    private closeTask(success: boolean) {
        this.closeEmitter.fire(success ? 0 : -1);
    }
}

export class QbsTaskProvider implements vscode.TaskProvider {
    public static scriptType: string = 'qbs';
    public static scriptSource: string = 'Qbs';

    public constructor() {
    }

    public async provideTasks(): Promise<QbsTask[]> {
        const result: QbsTask[] = [];
        result.push(await this.provideTask(QbsTaskCommandType.Build));
        result.push(await this.provideTask(QbsTaskCommandType.Clean));
        result.push(await this.provideTask(QbsTaskCommandType.Install));
        result.push(await this.provideTask(QbsTaskCommandType.Rebuild));
        result.push(await this.provideTask(QbsTaskCommandType.Resolve));
        return result;
    }

    public async resolveTask(task: QbsTask): Promise<QbsTask | undefined> {
        const execution: any = task.execution;
        if (!execution) {
            const definition: QbsTaskDefinition = <any>task.definition;
            return QbsTaskProvider.createTask(definition);
        }
        return undefined;
    }

    private async provideTask(commandType: QbsTaskCommandType): Promise<QbsTask> {
        const createProducts = (commandType: QbsTaskCommandType) => {
            if (commandType === QbsTaskCommandType.Build
                || commandType === QbsTaskCommandType.Clean
                || commandType === QbsTaskCommandType.Install
                || commandType === QbsTaskCommandType.Rebuild) {
                const product = QbsProjectManager.getInstance().getProject()?.getBuildProductName();
                return (product) ? [product] : [];
            }
        };

        const taskName = QbsTaskProvider.createTaskName(commandType);
        const definition: QbsTaskDefinition = {
            type: QbsTaskProvider.scriptType,
            label: taskName,
            command: commandType,
            products: createProducts(commandType)
        };
        const task = QbsTaskProvider.createTask(definition);
        task.detail = localize('qbs.taskprovider.template.task', 'Qbs template {0} task', taskName);
        task.group = QbsTaskProvider.createTaskGroup(commandType);
        return task;
    }

    private static createTask(definition: QbsTaskDefinition): QbsTask {
        const task: QbsTask = new vscode.Task(definition, vscode.TaskScope.Workspace, definition.label, QbsTaskProvider.scriptSource,
            new vscode.CustomExecution(async (resolvedDefinition: vscode.TaskDefinition): Promise<vscode.Pseudoterminal> =>
                new QbsTaskTerminal(resolvedDefinition)
            ), []);
        return task;
    }

    private static createTaskGroup(commandType: QbsTaskCommandType): vscode.TaskGroup | undefined {
        switch (commandType) {
            case QbsTaskCommandType.Build:
                return vscode.TaskGroup.Build;
            case QbsTaskCommandType.Clean:
                return vscode.TaskGroup.Clean;
            case QbsTaskCommandType.Rebuild:
                return vscode.TaskGroup.Rebuild;
        }
    }

    private static createTaskName(commandType: QbsTaskCommandType): string {
        switch (commandType) {
            case QbsTaskCommandType.Build:
                return localize('qbs.taskprovider.build.command', 'Build');
            case QbsTaskCommandType.Clean:
                return localize('qbs.taskprovider.clean.command', 'Clean');
            case QbsTaskCommandType.Install:
                return localize('qbs.taskprovider.install.command', 'Install');
            case QbsTaskCommandType.Rebuild:
                return localize('qbs.taskprovider.rebuild.command', 'Rebuild');
            case QbsTaskCommandType.Resolve:
                return localize('qbs.taskprovider.resolve.command', 'Resolve');
            default:
                return '';
        };
    };
}
