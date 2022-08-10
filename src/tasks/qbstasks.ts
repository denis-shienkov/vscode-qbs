import * as vscode from 'vscode';
import * as nls from 'vscode-nls';

import {QbsSession} from '../qbssession';
import {QbsMessageResponse} from '../datatypes/qbsmessageresponse';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

const endOfLine: string = "\r\n";

interface QbsTaskDefinition extends vscode.TaskDefinition {
    type: string;
    label: string;
    command: string;
    products?: string[];
    problemMatcher?: string[];
}

enum CommandType {
    resolve = "resolve",
    build = "build",
    rebuild = "rebuild",
    clean ="clean"
}

export class QbsTask extends vscode.Task {
    detail?: string;
}

export class QbsTaskProvider implements vscode.TaskProvider {
    static scriptType: string = 'qbs';

    constructor(private session: QbsSession) {
    }

    public async provideTasks(): Promise<QbsTask[]> {
        const result: QbsTask[] = [];
        result.push(await this.provideTask(CommandType.resolve));
        result.push(await this.provideTask(CommandType.build));
        result.push(await this.provideTask(CommandType.rebuild));
        result.push(await this.provideTask(CommandType.clean));
        return result;
    }

    createTask(definition: QbsTaskDefinition): QbsTask {
        const task: QbsTask = new vscode.Task(definition, vscode.TaskScope.Workspace, definition.label, QbsTaskProvider.scriptType,
            new vscode.CustomExecution(async (resolvedDefinition: vscode.TaskDefinition): Promise<vscode.Pseudoterminal> =>
                new CustomBuildTaskTerminal(resolvedDefinition, this.session)
            ), definition?.problemMatcher);
        return task;
    }

    public async provideTask(commandType: CommandType): Promise<QbsTask> {
        const taskName: string = localize("qbs-tools.command.qbs." + commandType.toString() + ".title", commandType.toString());
        const definition: QbsTaskDefinition = {
            type: QbsTaskProvider.scriptType,
            label: QbsTaskProvider.scriptType + ": " + taskName,
            command: commandType
        };
        const task = this.createTask(definition);
        task.group = commandType === CommandType.build ? vscode.TaskGroup.Build : undefined;
        return task;
    }

    public async resolveTask(task: QbsTask): Promise<QbsTask | undefined> {
        const execution: any = task.execution;
        if (!execution) {
            const definition: QbsTaskDefinition = <any>task.definition;
            return this.createTask(definition);
        }
        return undefined;
    }
}

class CustomBuildTaskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private subscriptions: vscode.Disposable[] = []

    public get onDidWrite(): vscode.Event<string> {
        return this.writeEmitter.event;
    }
    public get onDidClose(): vscode.Event<number> {
        return this.closeEmitter.event;
    }

    constructor(private _taskDef: vscode.TaskDefinition, private _session: QbsSession) {
        this.subscriptions.push(this._session.onProcessResultReceived(async (result) => {
            const hasOutput = result._stdOutput.length || result._stdError.length;
            if (result._success && !hasOutput) {
                return;
            }
            for (const line of result._stdError) {
                this.output(line)
            }
            for (const line of result._stdOutput) {
                this.output(line)
            }
        }));

        const outputRedirect = async (result: QbsMessageResponse) => {
            if (!result.isEmpty()) {
                await this.output(result.toString());
            }
        };
        
        this.subscriptions.push(this._session.onProjectResolved(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onProjectBuilt(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onProjectCleaned(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onProjectInstalled(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onCommandDescriptionReceived(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onRunEnvironmentResultReceived(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onWarningMessageReceived(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onProtocolErrorMessageReceived(async (result) => await outputRedirect(result)));
        this.subscriptions.push(this._session.onLogMessageReceived(async (result) => await outputRedirect(result)));
    }

    output(line: string): void {
        this.writeEmitter.fire(line + endOfLine);
    }

    async open(_initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
        // At this point we can start using the terminal.
        switch (this._taskDef.command) {
            case CommandType.resolve:
                await this.runResolveTask();
                break;
            case CommandType.build:
                await this.runBuildTask();
                break;
            case CommandType.rebuild:
                await this.runRebuildTask();
                break;
            case CommandType.clean:
                await this.runCleanTask();
                break;
            default:
                this.writeEmitter.fire(localize("command.not.recognized", '{0} is not a recognized command.', `"${this._taskDef.command}"`) + endOfLine);
                this.closeEmitter.fire(-1);
                return;
        }
    }

    close(): void {
        // The terminal has been closed. Shutdown the build.
    }

    private clearSubscriptions() {
        this.subscriptions.forEach(sub => {
            sub.dispose();
        })
        this.subscriptions = [];
    }

    private async runBuildTask(): Promise<any> {
        if (this._taskDef.products?.length) {
            const result: number | undefined = await vscode.commands.executeCommand('qbs.buildProducts', this._taskDef?.products);
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        else {
            const result: number = await vscode.commands.executeCommand('qbs.build');
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        this.clearSubscriptions();
    }

    private async runRebuildTask(): Promise<any> {
        if (this._taskDef.products?.length) {
            const result: number | undefined = await vscode.commands.executeCommand('qbs.rebuildProducts', this._taskDef?.products);
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        else {
            const result: number | undefined =  await vscode.commands.executeCommand('qbs.rebuild');
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        this.clearSubscriptions();
    }

    private async runResolveTask(): Promise<any> {
        const result: number | undefined =  await vscode.commands.executeCommand('qbs.resolve');
        this.closeEmitter.fire(result != undefined ? result : -1);
        this.clearSubscriptions();
    }

    private async runCleanTask(): Promise<any> {
        if (this._taskDef.products?.length) {
            const result: number | undefined = await vscode.commands.executeCommand('qbs.cleanProducts', this._taskDef?.products);
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        else {
            const result: number | undefined =  await vscode.commands.executeCommand('qbs.clean');
            this.closeEmitter.fire(result != undefined ? result : -1);
        }
        this.clearSubscriptions();
    }
}