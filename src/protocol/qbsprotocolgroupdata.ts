import { QbsProtocolLocationData } from './qbsprotocollocationdata';
import { QbsProtocolModulePropertiesData } from './qbsprotocolmodulepropertiesdata';
import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolSourceArtifactData } from './qbsprotocolsourceartifactdata';

/** Helper data type for wrapping the group object for Qbs protocol. */
export class QbsProtocolGroupData {
    public constructor(private readonly data: any) { }

    public getIsEmpty(): boolean {
        return (this.getSourceArtifacts().length === 0)
            && (this.getSourceWildcardArtifacts().length === 0);
    }

    public getIsEnabled(): boolean | undefined { return this.data[QbsProtocolDataKey.IsEnabled]; }

    public getLocation(): QbsProtocolLocationData | undefined {
        const data = this.data[QbsProtocolDataKey.Location];
        return (data) ? new QbsProtocolLocationData(data) : undefined;
    }

    public getModuleProperties(): QbsProtocolModulePropertiesData | undefined {
        const data = this.data[QbsProtocolDataKey.ModuleProperties];
        return (data) ? new QbsProtocolModulePropertiesData(data) : undefined;
    }

    public getName(): string | undefined { return this.data[QbsProtocolDataKey.Name]; }

    public getSourceArtifacts(): QbsProtocolSourceArtifactData[] {
        return (this.data[QbsProtocolDataKey.SourceArtifacts] || [])
            .map((data: any) => new QbsProtocolSourceArtifactData(data));
    }

    public getSourceWildcardArtifacts(): QbsProtocolSourceArtifactData[] {
        return (this.data[QbsProtocolDataKey.SourceArtifactsFromWildcards] || [])
            .map((data: any) => new QbsProtocolSourceArtifactData(data));;
    }
}
