import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolGroupData } from './qbsprotocolgroupdata';
import { QbsProtocolLocationData } from './qbsprotocollocationdata';
import { QbsProtocolModulePropertiesData } from './qbsprotocolmodulepropertiesdata';

export enum QbsProtocolProductType {
    Application = 'application',
    DynamicLibrary = 'dynamiclibrary',
    StaticLibrary = 'staticlibrary',
}

/** Helper data type for wrapping the product object for Qbs protocol. */
export class QbsProtocolProductData {
    public constructor(private readonly data: any) { }

    public getBuildDirectory(): string | undefined { return this.data[QbsProtocolDataKey.BuildDirectory]; }

    public getFullDisplayName(): string | undefined {
        return (typeof this.data === 'string')
            ? this.data.toString() : this.data[QbsProtocolDataKey.FullDisplayName];
    }

    public getGroups(): QbsProtocolGroupData[] {
        return (this.data[QbsProtocolDataKey.Groups] || [])
            .map((data: any) => new QbsProtocolGroupData(data));
    }

    public getIsEmpty(): boolean { return typeof this.data === 'string'; }
    public getIsEnabled(): boolean | undefined { return this.data[QbsProtocolDataKey.IsEnabled]; }
    public getIsRunnable(): boolean | undefined { return this.data[QbsProtocolDataKey.IsRunnable]; }

    public getLocation(): QbsProtocolLocationData | undefined {
        const data = this.data[QbsProtocolDataKey.Location];
        return (data) ? new QbsProtocolLocationData(data) : undefined;
    }

    public getModuleProperties(): QbsProtocolModulePropertiesData | undefined {
        const data = this.data[QbsProtocolDataKey.ModuleProperties];
        return (data) ? new QbsProtocolModulePropertiesData(data) : undefined;
    }

    public getName(): string | undefined { return this.data[QbsProtocolDataKey.Name]; }

    public getTargetExecutable(): string | undefined {
        return this.data[QbsProtocolDataKey.TargetExecutable];
    }

    public getType(): string[] { return this.data[QbsProtocolDataKey.Type] || []; }
}
