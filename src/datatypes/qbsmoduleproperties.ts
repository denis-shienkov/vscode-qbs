import {QbsCppKey} from './qbskeys';
import {QbsQbsKey} from './qbskeys';

export namespace QbsModuleProperties {
    export const Exported = [
        // Cpp module keys.
        QbsCppKey.CLanguageVersion,
        QbsCppKey.CompilerDefinesByLanguage,
        QbsCppKey.CompilerIncludePaths,
        QbsCppKey.CompilerName,
        QbsCppKey.CompilerPath,
        QbsCppKey.CompilerPathByLanguage,
        QbsCppKey.CompilerVersionMajor,
        QbsCppKey.CompilerVersionMinor,
        QbsCppKey.CompilerVersionPatch,
        QbsCppKey.CxxLanguageVersion,
        QbsCppKey.Defines,
        QbsCppKey.DistributionIncludePaths,
        QbsCppKey.FrameworkPaths,
        QbsCppKey.IncludePaths,
        QbsCppKey.PlatformDefines,
        QbsCppKey.PrefixHeaders,
        QbsCppKey.SystemFrameworkPaths,
        QbsCppKey.SystemIncludePaths,
        // Qbs module keys.
        QbsQbsKey.Architecture,
        QbsQbsKey.Toolchain,
    ]
}
