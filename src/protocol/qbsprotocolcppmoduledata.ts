import { QbsProtocolCppModuleKey } from './qbsprotocolcppmodulekey';

/** Helper data type for wrapping the Cpp module properties object for Qbs protocol. */
export class QbsProtocolCppModuleData {
    public constructor(private readonly data: any) { }

    public getCLanguageVersion(): string[] {
        return this.data[QbsProtocolCppModuleKey.CLanguageVersion] || [];
    }

    public getCxxLanguageVersion(): string[] {
        return this.data[QbsProtocolCppModuleKey.CxxLanguageVersion] || [];
    }

    public getCompilerName(): string | undefined {
        return this.data[QbsProtocolCppModuleKey.CompilerName];
    }

    public getCompilerPath(): string | undefined {
        return this.data[QbsProtocolCppModuleKey.CompilerPath];
    }

    public getCompilerPathByLanguage(): any {
        return this.data[QbsProtocolCppModuleKey.CompilerPathByLanguage];
    }

    public getCompilerVersionMajor(): number | undefined {
        return this.data[QbsProtocolCppModuleKey.CompilerVersionMajor];
    }

    public getCompilerVersionMinor(): number | undefined {
        return this.data[QbsProtocolCppModuleKey.CompilerVersionMinor];
    }

    public getCompilerVersionPatch(): number | undefined {
        return this.data[QbsProtocolCppModuleKey.CompilerVersionPatch];
    }

    public getCompilerDefinesByLanguage(language: string): any {
        const data = this.data[QbsProtocolCppModuleKey.CompilerDefinesByLanguage];
        return (data) ? (data[language] || {}) : {};
    }

    public getCompilerIncludePaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.CompilerIncludePaths] || [];
    }

    public getDistributionIncludePaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.DistributionIncludePaths] || [];
    }

    public getSystemIncludePaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.SystemIncludePaths] || [];
    }

    public getIncludePaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.IncludePaths] || [];
    }

    public getFrameworkPaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.FrameworkPaths] || [];
    }

    public getSystemFrameworkPaths(): string[] {
        return this.data[QbsProtocolCppModuleKey.SystemFrameworkPaths] || [];
    }

    public getPrefixHeaders(): string[] {
        return this.data[QbsProtocolCppModuleKey.PrefixHeaders] || [];
    }

    public getDefines(): string[] {
        return this.data[QbsProtocolCppModuleKey.Defines] || [];
    }

    public getPlatformDefines(): string[] {
        return this.data[QbsProtocolCppModuleKey.PlatformDefines] || [];
    }

    public getIsValid(): boolean { return this.data; }
}
