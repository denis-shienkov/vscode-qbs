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

export class QbsSessionErrorInfoResult {
    readonly _description: string = '';
    readonly _filePath: string = '';
    readonly _line: number = -1;

    constructor(object: string)
    constructor(readonly object: any) {
        if (typeof object === 'string') {
            this._description = object;
        } else {
            this._description = object['description'];
            const location = object['location'];
            this._filePath = object['file-path'];
            this._line = parseInt(object['line']);
        }
    }

    toString(): string {
        let s: string = this._filePath;
        if (s.length > 0 && this._line != -1)
            s += ':' + this._line;
        if (s.length > 0)
            s += ':';
        s += this._description;
        return s;
    }
}

export class QbsSessionErrorInfoDetailsResult {
    readonly _messages: QbsSessionErrorInfoResult[] = [];

    constructor(readonly object: any) {
        if (typeof object === 'string') {
            const message = new QbsSessionErrorInfoResult(object);
            this._messages.push(message);
        } else {
            const items = object['items'];
            for (const item of items) {
                const message = new QbsSessionErrorInfoResult(item);
                this._messages.push(message);
            }
        }
    }

    hasError(): boolean {
        return this._messages.length > 0;
    }

    toString(): string {
        let list: string[] = [];
        for (const message of this._messages) {
            const s = message.toString();
            list.push(s);
        }
        return list.join('\n');
    }
}
