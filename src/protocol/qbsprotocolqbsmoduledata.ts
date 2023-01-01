import { QbsProtocolQbsModuleKey } from './qbsprotocolqbsmodulekey';

// Known toolchain names.
export enum QbsToolchain {
    Clang = 'clang',
    ClangCl = 'clang-cl',
    Cosmic = 'cosmic',
    Gcc = 'gcc',
    Iar = 'iar',
    Keil = 'keil',
    Llvm = 'llvm',
    MinGw = 'mingw',
    Msvc = 'msvc',
    Sdcc = 'sdcc',
}

// Known architectures.
export enum QbsArchitecture {
    Arm = 'arm',
    X86 = 'x86',
    X8664 = 'x86_64',
}

/** Helper data type for wrapping the Qbs module properties object for Qbs protocol. */
export class QbsProtocolQbsModuleData {
    public constructor(private readonly data: any) { }

    public getArchitecture(): string | undefined {
        return this.data[QbsProtocolQbsModuleKey.Architecture];
    }

    public getConfigurationName(): string | undefined {
        return this.data[QbsProtocolQbsModuleKey.ConfigurationName];
    }

    public getData(): any { return this.data; }

    public getIsValid(): boolean { return this.data; }

    public getTargetPlatform(): string | undefined {
        return this.data[QbsProtocolQbsModuleKey.TargetPlatform];
    }

    public getToolchain(): string[] {
        return this.data[QbsProtocolQbsModuleKey.Toolchain] || [];
    }

    public getToolchainType(): string | undefined {
        return this.data[QbsProtocolQbsModuleKey.ToolchainType];
    }

    public setArchitecture(architecture: string) {
        this.data[QbsProtocolQbsModuleKey.Architecture] = architecture;
    }

    public setTargetPlatform(targetPlatform: string) {
        this.data[QbsProtocolQbsModuleKey.TargetPlatform] = targetPlatform;
    }

    public setToolchainType(toolchainType: string) {
        this.data[QbsProtocolQbsModuleKey.ToolchainType] = toolchainType;
    }
}
