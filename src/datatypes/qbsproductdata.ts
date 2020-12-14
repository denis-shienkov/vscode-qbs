import {QbsDataKey} from './qbskeys';
import {QbsGroupData} from './qbsgroupdata';
import {QbsLocationData} from './qbslocationdata';
import {QbsModulePropertiesData} from './qbsmodulepropertiesdata';

export class QbsProductData {
    constructor(private readonly _data: any) {}

    id(): string {
        return this.buildDirectory();
    }

    name(): string {
        return this._data[QbsDataKey.Name];
    }

    fullDisplayName(): string {
        return (typeof this._data === 'string')
            ? this._data.toString()
            : this._data[QbsDataKey.FullDisplayName];
    }

    buildDirectory(): string {
        return this._data[QbsDataKey.BuildDirectory];
    }

    location(): QbsLocationData {
        return new QbsLocationData(this._data[QbsDataKey.Location]);
    }

    targetExecutable(): string {
        return this._data[QbsDataKey.TargetExecutable];
    }

    isRunnable(): boolean {
        return this._data[QbsDataKey.IsRunnable];
    }

    isEnabled(): boolean {
        return this._data[QbsDataKey.IsEnabled];
    }

    isEmpty(): boolean {
         return typeof this._data === 'string';
    }

    moduleProperties(): QbsModulePropertiesData {
        return new QbsModulePropertiesData(this._data[QbsDataKey.ModuleProperties]);
    }

    groups(): QbsGroupData[] {
        const groups: QbsGroupData[] = [];
        const datas: any[] = this._data[QbsDataKey.Groups] || [];
        datas.forEach(data => groups.push(new QbsGroupData(data)));
        return groups;
    }
}
