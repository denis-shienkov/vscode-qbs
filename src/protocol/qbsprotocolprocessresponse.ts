import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the process response data for Qbs protocol. */
export class QbsProtocolProcessResponse {
    public readonly arguments: string[];
    public readonly executable?: string;
    public readonly stdError: string[];
    public readonly stdOutput: string[];
    public readonly success: boolean | undefined;
    public readonly workingDirectory: string | undefined;

    public constructor(response: any) {
        this.arguments = response[QbsProtocolDataKey.Arguments] || [];
        this.executable = response[QbsProtocolDataKey.ExecutableFilePath];
        this.stdError = response[QbsProtocolDataKey.StdErr] || [];
        this.stdOutput = response[QbsProtocolDataKey.StdOut] || [];
        this.success = JSON.parse(response[QbsProtocolDataKey.Success]);
        this.workingDirectory = response[QbsProtocolDataKey.WorkingDirectory];
    }
}
