import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as vscode from 'vscode';

import { isEmpty } from './qbsutils';
import { QbsBuildConfigurationManager } from './qbsbuildconfigurationmanager';
import { QbsBuildProfileManager } from './qbsbuildprofilemanager';
import { QbsBuildSystem } from './qbsbuildsystem';
import { QbsCommandKey } from './datatypes/qbscommandkey';
import { QbsLaunchConfigurationManager } from './qbslaunchconfigurationmanager';
import { QbsProjectManager } from './qbsprojectmanager';
import { QbsSessionState } from './qbssession';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

class Button {
    protected readonly button: vscode.StatusBarItem;
    protected disposable1?: vscode.Disposable
    protected disposable2?: vscode.Disposable

    public constructor(
        protected readonly placeholder: string,
        tooltip: string,
        alignment: vscode.StatusBarAlignment,
        priority?: number,
        command?: string | vscode.Command) {
        this.button = vscode.window.createStatusBarItem(alignment, priority);
        this.button.command = command;
        this.setTooltip(tooltip);
        this.button.show();
    }

    public dispose(): void {
        this.disposable1?.dispose();
        this.disposable2?.dispose();
        this.button.dispose();
    }

    public setColor(color: string): void { this.button.color = color; }
    public setTooltip(tooltip: string) { this.button.tooltip = tooltip; }
}

class SessionStatusButton extends Button {
    public constructor() {
        super(localize('qbs.session.status.placeholder', 'N/A'),
            localize('qbs.session.status.tooltip', 'Qbs Session State'),
            vscode.StatusBarAlignment.Left, -1);

        QbsBuildSystem.getInstance().getSession().onStateChanged(async () => this.update());
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `$(info) Qbs: ${text}`
    }

    private update(): void {
        this.setText(SessionStatusButton.getSessionStateName(
            QbsBuildSystem.getInstance().getSession().getState()))
    }

    /** Returns the localized Qbs session @c status name. */
    private static getSessionStateName(status: QbsSessionState): string {
        switch (status) {
            case QbsSessionState.Started:
                return localize('qbs.session.state.started', 'Started');
            case QbsSessionState.Starting:
                return localize('qbs.session.state.starting', 'Starting');
            case QbsSessionState.Stopped:
                return localize('qbs.session.state.stopped', 'Stopped');
            case QbsSessionState.Stopping:
                return localize('qbs.session.state.stopping', 'Stopping');
        }
    }
}

class SelectProjectButton extends Button {
    public constructor() {
        super(localize('qbs.select.active.project.file.placeholder', 'N/A'),
            localize('qbs.select.active.project.file.tooltip', 'Click to Select the Active Project'),
            vscode.StatusBarAlignment.Left, -2, QbsCommandKey.LoadProject);

        QbsProjectManager.getInstance().onProjectOpen(async () => this.update());
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `$(project) [${text}]`
    }

    private update(): void {
        this.setText(QbsProjectManager.getInstance().getProject()?.getName());
    }
}

class SelectBuildProfileButton extends Button {
    public constructor() {
        super(localize('qbs.select.build.profile.placeholder', 'Default'),
            localize('qbs.select.build.profile.tooltip', 'Click to Select the Build Profile'),
            vscode.StatusBarAlignment.Left, -3, QbsCommandKey.SelectBuildProfile);

        QbsBuildProfileManager.getInstance().onUpdated(async () => this.update());

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onProfileNameChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `$(tools) [${text}]`
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getProfileName();
        const profile = QbsBuildProfileManager.getInstance().findProfile(value);
        const friendlyName = profile?.getName();
        this.setText(friendlyName);
    }
}

class SelectBuildConfigurationButton extends Button {
    public constructor() {
        super(localize('qbs.select.build.configuration.placeholder', 'Debug'),
            localize('qbs.select.build.configuration.tooltip', 'Click to Select the Build Configuration'),
            vscode.StatusBarAlignment.Left, -4, QbsCommandKey.SelectBuildConfiguration);

        QbsBuildConfigurationManager.getInstance().onUpdated(async () => this.update());

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onConfigurationNameChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `$(settings) [${text}]`
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getConfigurationName();
        const configuration = QbsBuildConfigurationManager.getInstance().findConfiguration(value);
        const friendlyName = configuration?.displayName || configuration?.name;
        this.setText(friendlyName);
    }
}

class BuildProductButton extends Button {
    public constructor() {
        super(localize('qbs.build.product.placeholder', 'Build'),
            localize('qbs.build.product.tooltip', 'Click to Build the Selected Product'),
            vscode.StatusBarAlignment.Left, -5, QbsCommandKey.BuildProduct);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            this.disposable2?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onBuildProductNameChanged(async () => this.update());
            this.disposable2 = project?.onProjectDataChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `$(gear) ${text}`;
    }

    private setCommand(command: string | vscode.Command): void {
        this.button.command = command;
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getBuildProductName();
        const product = QbsProjectManager.getInstance().getProject()?.findProduct(value);
        const fullName = product?.getFullDisplayName();
        this.setCommand({
            title: 'build',
            command: QbsCommandKey.BuildProduct,
            arguments: (fullName) ? [[fullName]] : [[]]
        });
        this.setText();
    }
}

class SelectBuildProductButton extends Button {
    public constructor() {
        super(localize('qbs.select.build.product.placeholder', 'ALL'),
            localize('qbs.select.build.product.tooltip', 'Click to Select the Product to Build'),
            vscode.StatusBarAlignment.Left, -6, QbsCommandKey.SelectBuildProduct);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            this.disposable2?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onBuildProductNameChanged(async () => this.update());
            this.disposable2 = project?.onProjectDataChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `[${text}]`;
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getBuildProductName();
        const product = QbsProjectManager.getInstance().getProject()?.findProduct(value);
        const fullName = product?.getName();
        this.setText(fullName);
    }
}

class RunProductButton extends Button {

    public constructor() {
        super(localize('qbs.run.product.placeholder', `$(play)`),
            localize('qbs.run.product.tooltip', 'Click to Run the Selected Product'),
            vscode.StatusBarAlignment.Left, -7, QbsCommandKey.RunProduct);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            this.disposable2?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onLaunchProductNameChanged(async () => this.update());
            this.disposable2 = project?.onProjectDataChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `${text}`;
    }

    private setCommand(command: string | vscode.Command): void {
        this.button.command = command;
    }

    private setTargetExecutable(executable?: string) {
        const exists = (executable) ? fs.existsSync(executable) : false;
        this.setColor(exists ? 'lightgreen' : 'orange');
    }

    private update(): void {
        this.setText(); // Only the placeholder.
        const value = QbsProjectManager.getInstance().getProject()?.getLaunchProductName();
        const product = QbsProjectManager.getInstance().getProject()?.findProduct(value);
        const fullName = product?.getFullDisplayName();
        const executable = product?.getTargetExecutable();
        this.setTargetExecutable(executable);

        this.setCommand({
            title: 'run product',
            command: QbsCommandKey.RunProduct,
            arguments: (fullName) ? [fullName] : undefined
        });
    }
}

class DebugProductButton extends Button {
    public constructor() {
        super(localize('qbs.debug.product.placeholder', `$(bug)`),
            localize('qbs.debug.product.tooltip', 'Click to Debug the Selected Product'),
            vscode.StatusBarAlignment.Left, -8, QbsCommandKey.DebugProduct);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            this.disposable2?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onLaunchProductNameChanged(async () => this.update());
            this.disposable2 = project?.onProjectDataChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `${text}`;
    }

    private setCommand(command: string | vscode.Command): void {
        this.button.command = command;
    }

    private setTargetExecutable(executable?: string) {
        const exists = (executable) ? fs.existsSync(executable) : false;
        this.setColor(exists ? 'lightgreen' : 'orange');
    }

    private update(): void {
        this.setText(); // Only the placeholder.
        const value = QbsProjectManager.getInstance().getProject()?.getLaunchProductName();
        const product = QbsProjectManager.getInstance().getProject()?.findProduct(value);
        const fullName = product?.getFullDisplayName();
        const executable = product?.getTargetExecutable();
        this.setTargetExecutable(executable);

        this.setCommand({
            title: 'debug',
            command: QbsCommandKey.DebugProduct,
            arguments: (fullName) ? [fullName] : undefined
        });
    }
}

class SelectRunProductButton extends Button {
    public constructor() {
        super(localize('qbs.select.run.product.placeholder', 'None'),
            localize('qbs.select.run.product.tooltip', 'Click to Select the Product to Debug or Run'),
            vscode.StatusBarAlignment.Left, -100, QbsCommandKey.SelectRunProduct);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            this.disposable2?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onLaunchProductNameChanged(async () => this.update());
            this.disposable2 = project?.onProjectDataChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `[${text}]`;
    }

    private setTargetExecutable(executable?: string) {
        const exists = (executable) ? fs.existsSync(executable) : false;
        let tooltip = localize('qbs.select.run.product.tooltip', 'Click to Select the Product to Debug or Run')
        if (exists) {
            tooltip += `\n\n${executable}`;
        }
        this.setTooltip(tooltip);
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getLaunchProductName();
        const product = QbsProjectManager.getInstance().getProject()?.findProduct(value);
        const fullName = product?.getFullDisplayName();
        this.setText(fullName);
        const executable = product?.getTargetExecutable();
        this.setTargetExecutable(executable);
    }
}

class SelectDebuggerButton extends Button {
    public constructor() {
        super(localize('qbs.select.debugger.placeholder', 'Auto'),
            localize('qbs.select.debugger.tooltip', 'Click to Select the Launch Configuration'),
            vscode.StatusBarAlignment.Right, undefined, QbsCommandKey.SelectLaunchConfiguration);

        QbsProjectManager.getInstance().onProjectOpen(async () => {
            this.disposable1?.dispose();
            const project = QbsProjectManager.getInstance().getProject();
            this.disposable1 = project?.onDebuggerNameChanged(async () => this.update());
            this.update();
        });
        this.update();
    }

    private setText(text?: string): void {
        text = isEmpty(text) ? this.placeholder : text;
        this.button.text = `[${text}]`;
    }

    private update(): void {
        const value = QbsProjectManager.getInstance().getProject()?.getDebuggerName();
        const configuration = QbsLaunchConfigurationManager.getInstance().findConfiguration(value);
        const friendlyName = configuration?.getName();
        this.setText(friendlyName);
    }
}

export class QbsStatusBar implements vscode.Disposable {
    private readonly buttons: Button[] = [];

    public constructor() {
        this.buttons.push(new SessionStatusButton());
        this.buttons.push(new SelectProjectButton());
        this.buttons.push(new SelectBuildProfileButton());
        this.buttons.push(new SelectBuildConfigurationButton());
        this.buttons.push(new BuildProductButton());
        this.buttons.push(new SelectBuildProductButton());
        this.buttons.push(new RunProductButton());
        this.buttons.push(new DebugProductButton());
        this.buttons.push(new SelectRunProductButton());
        this.buttons.push(new SelectDebuggerButton());
    }

    public dispose(): void { this.buttons.forEach((b) => b.dispose()); }
}
