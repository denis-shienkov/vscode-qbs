import { basename } from 'path';

import { QbsProtocolDataKey } from './qbsprotocoldatakey';

export class QbsProtocolLocationData {
    public constructor(private readonly data: any) { }

    public getFilePath(): string | undefined { return this.data[QbsProtocolDataKey.FilePath]; }

    public getFileName(): string | undefined {
        const fsPath = this.getFilePath();
        return (fsPath) ? basename(fsPath) : undefined;
    }

    public getLine(): number | undefined { return this.data[QbsProtocolDataKey.Line]; }
    public getColumn(): number | undefined { return this.data[QbsProtocolDataKey.Column]; }
}
