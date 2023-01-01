import { QbsProtocolCppModuleData } from './qbsprotocolcppmoduledata';
import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolQbsModuleData } from './qbsprotocolqbsmoduledata';

/** Helper data type for wrapping the module properties object for Qbs protocol. */
export class QbsProtocolModulePropertiesData {
    public constructor(private readonly data: any) { }

    public getCppModuleProperties(): QbsProtocolCppModuleData | undefined {
        var props: any = {};
        for (var key in this.data) {
            const preamble = QbsProtocolDataKey.Cpp + '.';
            const index = key.indexOf(preamble);
            if (index !== 0)
                continue;
            props[key.substring(preamble.length)] = this.data[key];
        }
        return new QbsProtocolCppModuleData(props);
    }

    public getQbsModuleProperties(): QbsProtocolQbsModuleData | undefined {
        var props: any = {};
        for (var key in this.data) {
            const preamble = QbsProtocolDataKey.Qbs + '.';
            const index = key.indexOf(preamble);
            if (index !== 0)
                continue;
            props[key.substring(preamble.length)] = this.data[key];
        }
        return new QbsProtocolQbsModuleData(props);
    }
}
