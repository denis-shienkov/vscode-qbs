import { QbsProtocolCppModuleKey } from './qbsprotocolcppmodulekey';
import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolQbsModuleKey } from './qbsprotocolqbsmodulekey';
import { QbsProtocolQtCoreModuleKey } from './qbsprotocolqtmodulekey';

export namespace QbsProtocolModuleProperties {
    export const Exported = [
        // Qbs module keys.
        QbsProtocolDataKey.Qbs + '.' + QbsProtocolQbsModuleKey.Architecture,
        QbsProtocolDataKey.Qbs + '.' + QbsProtocolQbsModuleKey.Architectures,
        QbsProtocolDataKey.Qbs + '.' + QbsProtocolQbsModuleKey.Toolchain,

        // Cpp module keys.
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CLanguageVersion,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CommonCompilerFlags,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerDefinesByLanguage,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerIncludePaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerName,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerPath,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerPathByLanguage,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerVersionMajor,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerVersionMinor,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CompilerVersionPatch,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CxxLanguageVersion,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.CxxStandardLibrary,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.Defines,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.DistributionIncludePaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.DriverFlags,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.EnableExceptions,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.EnableRtti,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.ExceptionHandlingModel,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.FrameworkPaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.IncludePaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.MachineType,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.MinimumDarwinVersion,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.MinimumDarwinVersionCompilerFlag,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.PlatformCommonCompilerFlags,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.PlatformDefines,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.PlatformDriverFlags,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.PositionIndependentCode,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.PrefixHeaders,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.SystemFrameworkPaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.SystemIncludePaths,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.Target,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.TargetArch,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.TargetOS,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.UseCPrecompiledHeader,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.UseCxxPrecompiledHeader,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.UseObjcPrecompiledHeader,
        QbsProtocolDataKey.Cpp + '.' + QbsProtocolCppModuleKey.UseObjcxxPrecompiledHeader,

        // Qt module keys.
        QbsProtocolDataKey.QtCore + '.' + QbsProtocolQtCoreModuleKey.EnableKeywords,
        QbsProtocolDataKey.QtCore + '.' + QbsProtocolQtCoreModuleKey.Version,
    ]
}
