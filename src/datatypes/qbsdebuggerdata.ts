import * as vscode from 'vscode';

import {QbsDebuggerKey} from './qbskeys';
import {QbsRunEnvironmentData} from './qbsrunenvironmentdata';

export class QbsDebuggerData {
    private _envData: QbsRunEnvironmentData = new QbsRunEnvironmentData({});

    constructor(private readonly _data: any) {}

    setName(name: string) {
        this._data[QbsDebuggerKey.Name] = name;
    }

    name(): string {
        return this._data[QbsDebuggerKey.Name];
    }

    setAutomatic(isAutomatic: boolean) {
        this._data[QbsDebuggerKey.IsAutomatic] = isAutomatic;
    }

    isAutomatic(): boolean {
        return this._data[QbsDebuggerKey.IsAutomatic] || false;
    }

    setProgram(program: string) {
        this._data[QbsDebuggerKey.Program] = program;
    }

    program(): string {
        return this._data[QbsDebuggerKey.Program] || '';
    }

    hasProgram(): boolean {
        return this._data[QbsDebuggerKey.Program];
    }

    setCwd(cwd: string) {
        this._data[QbsDebuggerKey.Cwd] = cwd;
    };

    cwd(): string {
        return this._data[QbsDebuggerKey.Cwd] || '';
    }

    environment(): object {
        return this._data[QbsDebuggerKey.Environment] || {};
    }

    setEnvironmentData(env: QbsRunEnvironmentData) {
        this._envData = env;
        const environment = Object.entries(env.data()).map(function([k, v]) {
            return {
                name: k,
                value: v
            };
        });
        this._data[QbsDebuggerKey.Environment] = environment;
    }

    environmentData(): QbsRunEnvironmentData {
        return this._envData;
    }

    setExternalConsole(console: boolean) {
        this._data[QbsDebuggerKey.ExternalConsole] = console;
    }

    hasExternalConsole(): boolean {
        return this._data[QbsDebuggerKey.ExternalConsole];
    }

    setRequest(request: string) {
        this._data[QbsDebuggerKey.Request] = request;
    }

    request(): string {
        return this._data[QbsDebuggerKey.Request] || '';
    }

    setType(type: string) {
        this._data[QbsDebuggerKey.Type] = type;
    }

    type(): string {
        return this._data[QbsDebuggerKey.Type] || '';
    }

    setMiMode(mode: string) {
        this._data[QbsDebuggerKey.MiMode] = mode;
    }

    miMode(): string {
        return this._data[QbsDebuggerKey.MiMode] || '';
    }

    setMiDebuggerPath(path: string) {
        this._data[QbsDebuggerKey.MiDebuggerPath] = path;
    }

    miDebuggerPath(): string {
        return this._data[QbsDebuggerKey.MiDebuggerPath] || '';
    }

    data(): vscode.DebugConfiguration {
        return this._data;
    }

    static createAutomatic(): QbsDebuggerData {
        const auto = new QbsDebuggerData({});
        auto.setAutomatic(true);
        auto.setName('Auto');
        auto.setRequest('launch');
        auto.setExternalConsole(false);
        return auto;
    }
}
