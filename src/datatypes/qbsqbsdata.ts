import {QbsQbsProfileDataKey} from './qbskeys';

export class QbsQbsData {
    constructor(private readonly _data: any = {}) {}

    architecture(): string {
        return this._data[QbsQbsProfileDataKey.Architecture];
    }

    targetPlatform(): string {
        return this._data[QbsQbsProfileDataKey.TargetPlatform];
    }

    toolchainType(): string {
        return this._data[QbsQbsProfileDataKey.ToolchainType];
    }

    configurationName(): string {
        return this._data[QbsQbsProfileDataKey.ConfigurationName];
    }

    setArchitecture(architecture: string) {
        this._data[QbsQbsProfileDataKey.Architecture] = architecture;
    }

    setTargetPlatform(targetPlatform: string) {
        this._data[QbsQbsProfileDataKey.TargetPlatform] = targetPlatform;
    }

    setToolchainType(toolchainType: string) {
        this._data[QbsQbsProfileDataKey.ToolchainType] = toolchainType;
    }

    data(): any {
        return this.data;
    }
}
