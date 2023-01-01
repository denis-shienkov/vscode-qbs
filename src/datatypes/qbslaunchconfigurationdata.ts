import * as vscode from 'vscode';

import { QbsLaunchConfigurationKey } from './qbslaunchconfigurationkey';
import { QbsProtocolRunEnvironmentData } from '../protocol/qbsprotocolrunenvironmentdata';

// See https://code.visualstudio.com/docs/editor/debugging.
export enum QbsLaunchConfigurationRequest {
    Attach = 'attach',
    Launch = 'launch',
}

export enum QbsLaunchConfigurationConsole {
    ExternalTerminal = 'externalTerminal',
    IntegratedTerminal = 'integratedTerminal',
    InternalConsole = 'internalConsole',
}

// From the separate `ms-vscode.cpptools` extension.
export enum QbsLaunchConfigurationType {
    Gdb = 'cppdbg',
    VisualStudio = 'cppvsdbg',
}

/** Helper data type for wrapping the debugger `launch.json` configuration. */
export class QbsLaunchConfigurationData {
    public constructor(private readonly data: any) { }

    public getRequest(): string | undefined { return this.data[QbsLaunchConfigurationKey.Request]; }
    public getCwd(): string | undefined { return this.data[QbsLaunchConfigurationKey.Cwd]; }
    public getData(): vscode.DebugConfiguration { return this.data; }
    public getEnvironment(): object | undefined { return this.data[QbsLaunchConfigurationKey.Environment]; }
    public getConsole(): string | undefined { return this.data[QbsLaunchConfigurationKey.Console]; }
    public getMiDebuggerPath(): string | undefined { return this.data[QbsLaunchConfigurationKey.MiDebuggerPath]; }
    public getName(): string | undefined { return this.data[QbsLaunchConfigurationKey.Name]; }
    public getNiMode(): string | undefined { return this.data[QbsLaunchConfigurationKey.MiMode]; }
    public getProgram(): string | undefined { return this.data[QbsLaunchConfigurationKey.Program]; }
    public getType(): string | undefined { return this.data[QbsLaunchConfigurationKey.Type]; }

    public setCwd(cwd?: string) {
        if (cwd)
            this.data[QbsLaunchConfigurationKey.Cwd] = cwd;
    };

    public setEnvironment(data: QbsProtocolRunEnvironmentData) {
        const d = data.getData();
        this.data[QbsLaunchConfigurationKey.Environment] = Object.entries(d)
            .map(function ([k, v]) { return { name: k, value: v }; });
    }

    public setConsole(console?: string) {
        if (console)
            this.data[QbsLaunchConfigurationKey.Console] = console;
    }

    public setMiDebuggerPath(fsPath?: string) {
        if (fsPath)
            this.data[QbsLaunchConfigurationKey.MiDebuggerPath] = fsPath;
    }

    public setMiMode(mode?: string) {
        if (mode)
            this.data[QbsLaunchConfigurationKey.MiMode] = mode;
    }

    public setName(name?: string) {
        if (name)
            this.data[QbsLaunchConfigurationKey.Name] = name;
    }

    public setProgram(program?: string) {
        if (program)
            this.data[QbsLaunchConfigurationKey.Program] = program;
    }

    public setRequest(request?: string) {
        if (request)
            this.data[QbsLaunchConfigurationKey.Request] = request;
    }

    public setType(type?: string) {
        if (type)
            this.data[QbsLaunchConfigurationKey.Type] = type;
    }
}
