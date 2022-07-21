import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as which from 'which';

import {QbsProject} from '../qbsproject';

import {QbsConfigData} from '../datatypes/qbsconfigdata';
import {QbsDebuggerData} from '../datatypes/qbsdebuggerdata';
import {QbsProductData} from '../datatypes/qbsproductdata';
import {QbsProfileData} from '../datatypes/qbsprofiledata';

import {QbsGetRunEnvironmentRequest} from '../datatypes/qbsgetrunenvironmentrequest';
import {QbsSettingsEvent} from '../qbssettings';

export class QbsRunStep implements vscode.Disposable {
    private _product?: QbsProductData;
    private _dbg?: QbsDebuggerData;
    private _onChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();

    readonly onChanged: vscode.Event<boolean> = this._onChanged.event;

    constructor(private readonly _project: QbsProject) {
        _project.session().settings().onChanged(async (event: QbsSettingsEvent) => {
            if (event == QbsSettingsEvent.TargetProductUpdateRequired && _project.session().settings().buildAndRunTheSameTarget()) {
                // Sync product with build step when buildAndRunTheSameTarget setting enabled
                _project.buildStep().setup(undefined, undefined, this._product);
            }
        });
    }

    dispose() {}

    project(): QbsProject { return this._project; }
    productName(): string { return this._product?.fullDisplayName() || ''; }
    targetExecutable(): string { return this._product?.targetExecutable() || ''; }
    debugger(): QbsDebuggerData | undefined { return this._dbg; }
    debuggerName(): string | undefined { return this._dbg?.name(); }

    async restore() {
        const group = `${this._project.name()}::`;
        const product = await this.extractProduct(group);
        const dbg = await this.extractDebugger(group);
        await this.setup(product, dbg);
    }

    async save() {
        const group = `${this._project.name()}::`;
        await this._project.session().extensionContext().workspaceState.update(`${group}RunProductName`, this.productName());
        await this._project.session().extensionContext().workspaceState.update(`${group}DebuggerName`, this.debuggerName());
    }

    async setup(product?: QbsProductData, dbg?: QbsDebuggerData) {
        if (this._project.session().settings().buildAndRunTheSameTarget())
            this._project.buildStep().setup(undefined, undefined, product);

        if (product)
            this._product = product;

        if (dbg)
            this._dbg = dbg;

        this.updateDebuggerConfiguration(true);

        if (!!product || !!dbg) {
            this._onChanged.fire(false);
            await this.save();
        }
    }

    private async extractProduct(group: string) {
        const products = (this._project.session().project()?.products() || [])
            .filter(product => product.isRunnable());
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}RunProductName`);
        const index = products.findIndex((product) => product.fullDisplayName() == name);
        return (index !== -1) ? products[index] : (products.length > 0 ? products[0] : undefined);
    }

    private async extractDebugger(group: string): Promise<QbsDebuggerData> {
        const dbgs = (await this._project.session().settings().enumerateDebuggers()) || [];
        const name = this._project.session().extensionContext().workspaceState.get<string>(`${group}DebuggerName`);
        const index = dbgs.findIndex((dbg) => dbg.name() == name);
        return dbgs[(index !== -1) ? index : 0];
    }

    private updateDebuggerConfiguration(envRequired: boolean) {
        const program = this._product?.targetExecutable() || '';
        const cwd = path.dirname(program);
        this._dbg?.setProgram(program);
        this._dbg?.setCwd(cwd);

        // Request env variables.
        if (envRequired) {
            new Promise<void>(resolve => {
                const envReceicedSubscription = this.project().session().onRunEnvironmentReceived(async (env) => {
                    this._dbg?.setEnvironmentData(env);
                    await envReceicedSubscription.dispose();
                    resolve();
                });
                const envRequest = new QbsGetRunEnvironmentRequest(this.project().session().settings());
                envRequest.setProduct(this.productName() || '');
                this.project().session().getRunEnvironment(envRequest);
            });
        }

        if (this._dbg?.isAutomatic()) {
            const properties = this._product?.moduleProperties();
            if (!properties?.isValid()) {
                return;
            }
            const toolchain = properties?.toolchain() || [];
            if (toolchain.indexOf('msvc') !== -1) {
                this._dbg.setType('cppvsdbg');
                return;
            } else if (toolchain.indexOf('gcc') !== -1) {
                this._dbg.setType('cppdbg');
                const compilerDirectory = path.dirname(properties?.compilerPath() || '');

                const detectDebuggerPath = (toolchainPath: string, debuggerName: string) => {
                    const ext = (process.platform === 'win32') ? '.exe' : '';
                    let debuggerPath = path.join(toolchainPath, debuggerName + ext);
                    if (!fs.existsSync(debuggerPath)) {
                        try {
                            debuggerPath = which.sync(debuggerName + ext);
                        } catch (e) {
                            return '';
                        }
                    }
                    return debuggerPath;
                };

                const cpptoolsExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
                const cpptoolsDebuggerPath = cpptoolsExtension ? path.join(cpptoolsExtension.extensionPath, "debugAdapters", "lldb-mi", "bin") : undefined;
                // Check for LLDB-MI debugger executable.
                let miDebuggerPath = detectDebuggerPath(compilerDirectory, 'lldb-mi');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('lldb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
                if (cpptoolsDebuggerPath) {
                    // Check for LLDB-MI installed by CppTools
                    miDebuggerPath = detectDebuggerPath(cpptoolsDebuggerPath, 'lldb-mi');
                    if (miDebuggerPath) {
                        this._dbg.setMiMode('lldb');
                        this._dbg.setMiDebuggerPath(miDebuggerPath);
                        return;
                    }
                }
                // Check for GDB debugger executable.
                miDebuggerPath = detectDebuggerPath(compilerDirectory, 'gdb');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('gdb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
                // Check for LLDB debugger executable.
                miDebuggerPath = detectDebuggerPath(compilerDirectory, 'lldb');
                if (miDebuggerPath) {
                    this._dbg.setMiMode('lldb');
                    this._dbg.setMiDebuggerPath(miDebuggerPath);
                    return;
                }
            }

            // TODO: Show error?
        }
    }
}
