import { QbsProtocolCppModuleData } from './qbsprotocolcppmoduledata';
import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolQbsModuleData } from './qbsprotocolqbsmoduledata';

/** Helper data type for wrapping the profile object for Qbs protocol. */
export class QbsProtocolProfileData {
    public constructor(private readonly name: string, private readonly data: any) { }

    public getData(): any { return this.data; }
    public getName(): string { return this.name; };

    public getQbs(): QbsProtocolQbsModuleData | undefined {
        const data = this.data[QbsProtocolDataKey.Qbs];
        return (data) ? new QbsProtocolQbsModuleData(data) : undefined;
    }

    public getCpp(): QbsProtocolCppModuleData | undefined {
        const data = this.data[QbsProtocolDataKey.Cpp];
        return (data) ? new QbsProtocolCppModuleData(data) : undefined;
    }

    public toMap(): any {
        let map: any = {};
        map[this.name] = this.data;
        return map;
    }
}
