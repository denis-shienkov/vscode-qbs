import * as vscode from 'vscode';

export class QbsSessionHelloResult {
    readonly _apiLevel: number = 0;
    readonly _apiCompatibilityLevel: number = 0;

    constructor(readonly object: any) {
        this._apiLevel = parseInt(object['api-level']);
        this._apiCompatibilityLevel = parseInt(object['api-compat-level']);
    }
}

export class QbsSessionProcessResult {
    readonly _executable: string;
    readonly _arguments: string[];
    readonly _workingDirectory: string;
    readonly _stdOutput: string[];
    readonly _stdError: string[];
    readonly _success: boolean;

    constructor(readonly object: any) {
        this._executable = object['executable-file-path'];
        this._workingDirectory = object['working-directory'];
        this._arguments = object['arguments'];
        this._stdOutput = object['stdout'];
        this._stdError = object['stderr'];
        this._success = JSON.parse(object['success']);
    }
}

export class QbsSessionTaskStartedResult {
    readonly _description: string;
    readonly _maxProgress: number;

    constructor(readonly object: any) {
        this._description = object['description'];
        this._maxProgress = parseInt(object['max-progress']);
    }
}

export class QbsSessionTaskProgressResult {
    readonly _progress: number;

    constructor(readonly object: any) {
        this._progress = parseInt(object['progress']);
    }
}

export class QbsSessionTaskMaxProgressResult {
    readonly _maxProgress: number;

    constructor(readonly object: any) {
        this._maxProgress = parseInt(object['max-progress']);
    }
}

export class QbsSessionMessageResult {
    readonly _description: string;

    constructor(readonly object: any) {
        this._description = object['message'];
    }
}

