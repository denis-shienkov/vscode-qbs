import { basename } from 'path';

import { QbsProtocolDataKey } from './qbsprotocoldatakey';

/** Helper data type for wrapping the source artifact object for Qbs protocol. */
export class QbsProtocolSourceArtifactData {
    public constructor(private readonly data: any) { }

    public getFileName(): string | undefined {
        const fsPath = this.getFilePath();
        return (fsPath) ? basename(fsPath) : undefined;
    }

    public getFilePath(): string | undefined { return this.data[QbsProtocolDataKey.FilePath]; }
    public getFileTags(): string[] { return this.data[QbsProtocolDataKey.FileTags] || []; }
}
