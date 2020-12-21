import {QbsDataKey} from './qbskeys';
import {QbsLocationData} from './qbslocationdata';
import {QbsModulePropertiesData} from './qbsmodulepropertiesdata';
import {QbsSourceArtifactData} from './qbssourceartifactdata';

export class QbsGroupData {
    constructor(private readonly _data: any) {}

    id(): string {
        return this.name();
    }

    name(): string {
        return this._data[QbsDataKey.Name];
    }

    location(): QbsLocationData {
        return new QbsLocationData(this._data[QbsDataKey.Location]);
    }

    moduleProperties(): QbsModulePropertiesData {
        return new QbsModulePropertiesData(this._data[QbsDataKey.ModuleProperties]);
    }

    sourceArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas: any[] = this._data[QbsDataKey.SourceArtifacts] || [];
        datas.forEach(data => artifacts.push(new QbsSourceArtifactData(data)));
        return artifacts;
    }

    sourceWildcardsArtifacts(): QbsSourceArtifactData[] {
        const artifacts: QbsSourceArtifactData[] = [];
        const datas: any[] = this._data[QbsDataKey.SourceArtifactsFromWildcards] || [];
        datas.forEach(data => artifacts.push(new QbsSourceArtifactData(data)));
        return artifacts;
    }

    isEnabled(): boolean {
        return this._data[QbsDataKey.IsEnabled];
    }

    isEmpty(): boolean {
        return this.sourceArtifacts().length === 0 && this.sourceWildcardsArtifacts().length === 0;
    }
}
