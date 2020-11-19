import * as vscode from 'vscode';
import * as fs from 'fs';
import {basename} from 'path';

import {QbsSettings} from './qbssettings';

// QBS session protocol resuests.

export abstract class QbsRequest {
    protected _data: any = {};
    data(): any { return this._data; }
}

export class QbsResolveRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'resolve-project';
        this._data['environment'] = process.env;
        this._data['data-mode'] = 'only-if-changed';
        this._data['module-properties'] = [
            'cpp.cLanguageVersion',
            'cpp.compilerDefinesByLanguage',
            'cpp.compilerIncludePaths',
            'cpp.compilerName',
            'cpp.compilerPath',
            'cpp.compilerPathByLanguage',
            'cpp.compilerVersionMajor',
            'cpp.compilerVersionMinor',
            'cpp.compilerVersionPatch',
            'cpp.cxxLanguageVersion',
            'cpp.defines',
            'cpp.distributionIncludePaths',
            'cpp.frameworkPaths',
            'cpp.includePaths',
            'cpp.platformDefines',
            'cpp.prefixHeaders',
            'cpp.systemFrameworkPaths',
            'cpp.systemIncludePaths',
            'qbs.architecture',
            'qbs.toolchain'
        ];
        const buildDirectory = settings ? settings.buildDirectory() : '';
        this._data['build-root'] = buildDirectory;
        // Do not store the build graph if the build directory does not exist yet.
        this._data['dry-run'] = !fs.existsSync(buildDirectory);
        this._data['settings-directory'] = settings ? settings.settingsDirectory() : '';
        this._data['force-probe-execution'] = settings ? settings.forceProbes() : false;
        this._data['error-handling-mode'] = settings ? settings.errorHandlingMode() : 'relaxed';
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setProjectFilePath(projectFilePath: string) { this._data['project-file-path'] = projectFilePath; }
    setConfigurationName(configurationName: string) { this._data['configuration-name'] = configurationName; }
    setTopLevelProfile(topLevelProfile: string) { this._data['top-level-profile'] = topLevelProfile; }
    setBuildRoot(buildRoot: string) { this._data['build-root'] = buildRoot; }
    setDryRun(dryRun: boolean) { this._data['dry-run'] = dryRun; }
    setSettingsDirectory(settingsDirectory: string) { this._data['settings-directory'] = settingsDirectory; }
    setForceProbeExecution(forceProbeExecution: boolean) { this._data['force-probe-execution'] = forceProbeExecution; }
    setErrorHandlingMode(errorHandlingMode: string) { this._data['error-handling-mode'] = errorHandlingMode; }
    setLogLevel(logLevel: string) { this._data['log-level'] = logLevel; }
}

export class QbsBuildRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'build-project';
        this._data['data-mode'] = 'only-if-changed';
        this._data['install'] = true;
        this._data['max-job-count'] = settings ? settings.maxJobs() : 0;
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['command-echo-mode'] = settings ? (settings.showCommandLines() ? 'command-line' : 'summary') : 'summary';
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
        this._data['clean-install-root'] = settings ? settings.cleanInstallRoot() : false;
        this._data['products'] = [];
    }

    setMaxJobCount(maxJobCount: number) { this._data['max-job-count'] = maxJobCount; }
    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setCommandEchoMode(commandEchoMode: string) { this._data['command-echo-mode'] = commandEchoMode; }
    setLogLevel(logLevel: string) { this._data['log-level'] = logLevel; }
    setCleanInstallRoot(cleanInstallRoot: boolean) { this._data['clean-install-root'] = cleanInstallRoot; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsCleanRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'clean-project';
        this._data['products'] = [];
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setLogLevel(logLevel: string) { this._data['log-level'] = logLevel; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsInstallRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'install-project';
        this._data['keep-going'] = settings ? settings.keepGoing() : false;
        this._data['log-level'] = settings ? settings.logLevel() : 'info';
    }

    setKeepGoing(keepGoing: boolean) { this._data['keep-going'] = keepGoing; }
    setLogLevel(logLevel: string) { this._data['log-level'] = logLevel; }
    setProductNames(productNames: string[]) {this._data['products'] = productNames; }
}

export class QbsCancelRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'cancel-job';
    }
}

export class QbsGetRunEnvironmentRequest extends QbsRequest {
    constructor(settings?: QbsSettings) {
        super();
        this._data['type'] = 'get-run-environment';
    }

    setProductName(productName: string) { this._data['product'] = productName; }
}

// QBS session protocol responses.

export class QbsHelloResponse {
    readonly _apiLevel: number = 0;
    readonly _apiCompatibilityLevel: number = 0;

    constructor(response: any) {
        this._apiLevel = parseInt(response['api-level']);
        this._apiCompatibilityLevel = parseInt(response['api-compat-level']);
    }
}

export class QbsProcessResponse {
    readonly _executable: string;
    readonly _arguments: string[];
    readonly _workingDirectory: string;
    readonly _stdOutput: string[];
    readonly _stdError: string[];
    readonly _success: boolean;

    constructor(response: any) {
        this._executable = response['executable-file-path'];
        this._workingDirectory = response['working-directory'];
        this._arguments = response['arguments'];
        this._stdOutput = response['stdout'];
        this._stdError = response['stderr'];
        this._success = JSON.parse(response['success']);
    }
}

export class QbsTaskStartedResponse {
    readonly _description: string;
    readonly _maxProgress: number;

    constructor(response: any) {
        this._description = response['description'];
        this._maxProgress = parseInt(response['max-progress']);
    }
}

export class QbsTaskProgressResponse {
    readonly _progress: number;

    constructor(response: any) {
        this._progress = parseInt(response['progress']);
    }
}

export class QbsTaskMaxProgressResponse {
    readonly _maxProgress: number;

    constructor(response: any) {
        this._maxProgress = parseInt(response['max-progress']);
    }
}

export class QbsMessageItemResponse {
    readonly _description: string = '';
    readonly _filePath: string = '';
    readonly _line: number = -1;

    constructor(msg: string)
    constructor(msg: any) {
        if (typeof msg === 'string') {
            this._description = msg;
        } else {
            this._description = msg['description'];
            const location = msg['location'] || {};
            this._filePath = location['file-path'] || '';
            this._line = parseInt(location['line'] || '-1');
        }
    }

    toString(): string {
        let s: string = this._filePath || '';
        if (s && !isNaN(this._line) && (this._line != -1))
            s += ':' + this._line;
        if (s)
            s += ':';
        s += this._description;
        return s;
    }
}

export class QbsMessageResponse {
    readonly _messages: QbsMessageItemResponse[] = [];

    constructor(obj: any) {
        if (typeof obj === 'string') {
            this._messages.push(new QbsMessageItemResponse(obj));
        } else if (obj) {
            const items: any[] = obj['items'] || [];
            items.forEach(item => this._messages.push(new QbsMessageItemResponse(item)));
        }
    }

    isEmpty(): boolean { return this._messages.length === 0; }

    toString(): string {
        const strings: string[] = [];
        this._messages.forEach(message => strings.push(message.toString()));
        return strings.join('\n');
    }
}

// QBS session operation types and statuses.

export enum QbsOperationType { Resolve, Build, Clean, Install }
export enum QbsOperationStatus { Started, Completed, Failed }

export class QbsOperation {
    constructor(readonly _type: QbsOperationType, readonly _status: QbsOperationStatus, readonly _elapsed: number) {}
}

// QBS project types.

export class QbsLocationData {
    constructor(private readonly _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    line(): number { return this._data['line']; }
    column(): number { return this._data['column']; }
    id(): string { return `${this.filePath()}:${this.line()}:${this.column()}`; }
}

export class QbsProjectData {
    constructor(private readonly _data: any) {}
    id(): string { return this.buildDirectory(); }
    name(): string { return this._data['name']; }
    buildDirectory(): string { return this._data['build-directory']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }
    isEmpty():boolean { return this._data === undefined; }
    data(): any { return this._data; }

    products(): QbsProductData[] {
        const products: QbsProductData[] = [];
        const datas: any[] = this._data['products'] || [];
        datas.forEach(data => products.push(new QbsProductData(data)));
        return products;
    }

    subProjects(): QbsProjectData[] {
        const projects: QbsProjectData[] = [];
        const datas: any[] = this._data['sub-projects'] || [];
        datas.forEach(data => projects.push(new QbsProjectData(data)));
        return projects;
    }

    allProducts(): QbsProductData[] {
        const products: QbsProductData[] = [];
        const extractProducts = (project: QbsProjectData) => {
            products.push(...project.products());
            const projects = project.subProjects();
            projects.forEach(project => extractProducts(project));
        }
        extractProducts(this);
        return products;
    }

    setBuildSystemFiles(files: any) { this._data['build-system-files'] = files; }
    buildSystemFiles(): any { return this._data['build-system-files']; }
}

export class QbsProductData {
    constructor(private readonly _data: any) {}
    id(): string { return this.buildDirectory(); }
    name(): string { return this._data['name']; }
    fullDisplayName(): string { return (typeof this._data === 'string')
        ? this._data.toString() : this._data['full-display-name']; }
    buildDirectory(): string { return this._data['build-directory']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }
    targetExecutable(): string { return this._data['target-executable']; }
    isRunnable(): boolean { return this._data['is-runnable']; }
    isEnabled(): boolean { return this._data['is-enabled']; }
    isEmpty(): boolean { return typeof this._data === 'string'; }

    moduleProperties(): QbsModulePropertiesData {
        return new QbsModulePropertiesData(this._data['module-properties']);
    }

    groups(): QbsGroupData[] {
        const groups: QbsGroupData[] = [];
        const datas: any[] = this._data['groups'] || [];
        datas.forEach(data => groups.push(new QbsGroupData(data)));
        return groups;
    }
}

export class QbsGroupData {
    constructor(private readonly _data: any) {}
    id(): string { return this.name(); }
    name(): string { return this._data['name']; }
    location(): QbsLocationData { return new QbsLocationData(this._data['location']); }

    moduleProperties(): QbsModulePropertiesData {
        return new QbsModulePropertiesData(this._data['module-properties']);
    }

    sourceArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas: any[] = this._data['source-artifacts'] || [];
        datas.forEach(data => artifacts.push(new QbsSourceArtifactData(data)));
        return artifacts;
    }

    sourceWildcardsArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas: any[] = this._data['source-artifacts-from-wildcards'] || [];
        datas.forEach(data => artifacts.push(new QbsSourceArtifactData(data)));
        return artifacts;
    }

    isEmpty(): boolean {
        return this.sourceArtifacts().length === 0 && this.sourceWildcardsArtifacts().length === 0;
    }
}

export class QbsSourceArtifactData {
    constructor(private readonly _data: any) {}
    filePath(): string { return this._data['file-path']; }
    fileName(): string { return basename(this.filePath()); }
    fileTags(): string[] { return this._data['file-tags']; }
    id(): string { return this.filePath(); }
}

export class QbsModulePropertiesData {
    constructor(private readonly _data: any) {}
    cLanguageVersion(): string[] { return this._data['cpp.cLanguageVersion'] || []; }
    compilerDefinesByLanguage(language: string): any {
        const defines = this._data['cpp.compilerDefinesByLanguage'];
        return defines[language];
    }
    compilerIncludePaths(): string[] { return this._data['cpp.compilerIncludePaths'] || []; }
    compilerName(): string { return this._data['cpp.compilerName'] || ''; }
    compilerPath(): string { return this._data['cpp.compilerPath'] || ''; }
    compilerPathByLanguage(): any { return this._data['cpp.compilerPathByLanguage']; }
    compilerVersionMajor(): number { return this._data['cpp.compilerVersionMajor'] || 0; }
    compilerVersionMinor(): number { return this._data['cpp.compilerVersionMinor'] || 0; }
    compilerVersionPatch(): number { return this._data['cpp.compilerVersionPatch'] || 0; }
    cxxLanguageVersion(): string[] { return this._data['cpp.cxxLanguageVersion'] || ''; }
    defines(): string[] { return this._data['cpp.defines'] || []; }
    distributionIncludePaths(): string[] { return this._data['cpp.distributionIncludePaths'] || []; }
    frameworkPaths(): string[] { return this._data['cpp.frameworkPaths'] || []; }
    includePaths(): string[] { return this._data['cpp.includePaths'] || []; }
    platformDefines(): string[] { return this._data['cpp.platformDefines'] || []; }
    prefixHeaders(): string[] { return this._data['cpp.prefixHeaders'] || []; }
    systemFrameworkPaths(): string[] { return this._data['cpp.systemFrameworkPaths'] || []; }
    systemIncludePaths(): string[] { return this._data['cpp.systemIncludePaths'] || []; }
    architecture(): string { return this._data['qbs.architecture'] || ''; }
    toolchain(): string[] { return this._data['qbs.toolchain'] || []; }

    isValid(): boolean { return this._data; }

    allIncludePaths(): string[] {
        return [
            ...this.compilerIncludePaths(),
            ...this.distributionIncludePaths(),
            ...this.systemIncludePaths(),
            ...this.includePaths(),
            ...this.frameworkPaths(),
            ...this.systemFrameworkPaths()
        ];
    }

    allDefines(): string[] {
        return [
            ...this.defines(),
            ...this.platformDefines()
        ];
    }
}

// QBS project configurations.

export class QbsProfileData {
    constructor(private readonly _name: string = '') {}
    name(): string { return this._name; }
}

export class QbsConfigData {
    constructor(private readonly _name: string, private readonly _displayName?: string, private readonly _description?: string) {}
    name(): string { return this._name; }
    displayName(): string | undefined { return this._displayName; }
    description(): string | undefined { return this._description; }
}

export class QbsDebuggerData {
    constructor(private readonly _data: any) {}
    setName(name: string) { this._data['name'] = name; }
    name(): string { return this._data['name']; }
    setAutomatic(isAutomatic: boolean) { this._data['is-automatic'] = isAutomatic; }
    isAutomatic(): boolean { return this._data['is-automatic'] || false; }
    setProgram(program: string) { this._data['program'] = program; }
    program(): string { return this._data['program'] || ''; }
    hasProgram(): boolean { return this._data['program']; }
    setCwd(cwd: string) { this._data['cwd'] = cwd; };
    cwd(): string { return this._data['cwd'] || ''; }
    setEnvironment(env: QbsRunEnvironmentData) { this._data['env'] = env.data(); };
    environment(): QbsRunEnvironmentData { return new QbsRunEnvironmentData(this._data['env'] || {}); }
    setExternalConsole(console: boolean) { this._data['externalConsole'] = console; }
    hasExternalConsole(): boolean { return this._data['externalConsole']; }
    setRequest(request: string) { this._data['request'] = request; }
    request(): string { return this._data['request'] || ''; }
    setType(type: string) { this._data['type'] = type; }
    type(): string { return this._data['type'] || ''; }
    setMiMode(mode: string) { this._data['MIMode'] = mode; }
    miMode(): string { return this._data['MIMode'] || ''; }
    setMiDebuggerPath(path: string) { this._data['miDebuggerPath'] = path; }
    miDebuggerPath(): string { return this._data['miDebuggerPath'] || ''; }
    data(): vscode.DebugConfiguration { return this._data; }

    static createAutomatic(): QbsDebuggerData {
        const auto = new QbsDebuggerData({});
        auto.setAutomatic(true);
        auto.setName('Auto');
        auto.setRequest('launch');
        auto.setExternalConsole(false);
        return auto;
    }
}

export class QbsRunEnvironmentData {
    constructor(private readonly _data: any) {}
    data(): any { return this._data; }
}
