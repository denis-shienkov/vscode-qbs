import {QbsDataKey} from './qbskeys';

export class QbsProcessResponse {
    readonly _executable: string;
    readonly _arguments: string[];
    readonly _workingDirectory: string;
    readonly _stdOutput: string[];
    readonly _stdError: string[];
    readonly _success: boolean;

    constructor(response: any) {
        this._executable = response[QbsDataKey.ExecutableFilePath];
        this._workingDirectory = response[QbsDataKey.WorkingDirectory];
        this._arguments = response[QbsDataKey.Arguments];
        this._stdOutput = response[QbsDataKey.StdOut];
        this._stdError = response[QbsDataKey.StdErr];
        this._success = JSON.parse(response[QbsDataKey.Success]);
    }
}
