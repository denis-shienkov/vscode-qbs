import {QbsCppKey} from './qbskeys';
import {QbsQbsKey} from './qbskeys';

export class QbsModulePropertiesData {
    constructor(private readonly _data: any) {}

    cLanguageVersion(): string[] {
        return this._data[QbsCppKey.CLanguageVersion] || [];
    }

    compilerDefinesByLanguage(language: string): any {
        const defines = this._data[QbsCppKey.CompilerDefinesByLanguage];
        return defines[language];
    }

    compilerIncludePaths(): string[] {
        return this._data[QbsCppKey.CompilerIncludePaths] || [];
    }

    compilerName(): string {
        return this._data[QbsCppKey.CompilerName] || '';
    }

    compilerPath(): string {
        return this._data[QbsCppKey.CompilerPath] || '';
    }

    compilerPathByLanguage(): any {
        return this._data[QbsCppKey.CompilerPathByLanguage];
    }

    compilerVersionMajor(): number {
        return this._data[QbsCppKey.CompilerVersionMajor] || 0;
    }

    compilerVersionMinor(): number {
        return this._data[QbsCppKey.CompilerVersionMinor] || 0;
    }

    compilerVersionPatch(): number {
        return this._data[QbsCppKey.CompilerVersionPatch] || 0;
    }

    cxxLanguageVersion(): string[] {
        return this._data[QbsCppKey.CxxLanguageVersion] || '';
    }

    defines(): string[] {
        return this._data[QbsCppKey.Defines] || [];
    }

    distributionIncludePaths(): string[] {
        return this._data[QbsCppKey.DistributionIncludePaths] || [];
    }

    frameworkPaths(): string[] {
        return this._data[QbsCppKey.FrameworkPaths] || [];
    }

    includePaths(): string[] {
        return this._data[QbsCppKey.IncludePaths] || [];
    }

    platformDefines(): string[] {
        return this._data[QbsCppKey.PlatformDefines] || [];
    }

    prefixHeaders(): string[] {
        return this._data[QbsCppKey.PrefixHeaders] || [];
    }

    systemFrameworkPaths(): string[] {
        return this._data[QbsCppKey.SystemFrameworkPaths] || [];
    }

    systemIncludePaths(): string[] {
        return this._data[QbsCppKey.SystemIncludePaths] || [];
    }

    architecture(): string {
        return this._data[QbsQbsKey.Architecture] || '';
    }

    toolchain(): string[] {
        return this._data[QbsQbsKey.Toolchain] || [];
    }

    isValid(): boolean {
        return this._data;
    }

    allIncludePaths(): string[] {
        return [
            ...this.compilerIncludePaths(),
            ...this.distributionIncludePaths(),
            ...this.systemIncludePaths(),
            ...this.includePaths(),
            ...this.frameworkPaths(),
            ...this.systemFrameworkPaths()
        ];
    }

    allDefines(): string[] {
        return [
            ...this.defines(),
            ...this.platformDefines()
        ];
    }
}
