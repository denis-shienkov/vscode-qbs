export enum QbsDataKey {
    ApiCompatLevel = 'api-compat-level',
    ApiLevel = 'api-level',
    Arguments = 'arguments',
    BuildDirectory = 'build-directory',
    BuildRoot = 'build-root',
    BuildSystemFiles = 'build-system-files',
    CleanInstallRoot = 'clean-install-root',
    Column = 'column',
    CommandDescription = 'command-description',
    CommandEchoMode = 'command-echo-mode',
    ConfigurationName = 'configuration-name',
    Cpp = "cpp",
    DataMode = 'data-mode',
    Description = 'description',
    DisplayName = 'displayName',
    DisplayNameOld = 'display-name',
    DryRun = 'dry-run',
    Environment = 'environment',
    Error = 'error',
    ErrorHandlingMode = 'error-handling-mode',
    ExecutableFilePath = 'executable-file-path',
    FilePath = 'file-path',
    FileTags = 'file-tags',
    FilesAdded = 'files-added',
    FilesRemoved = 'files-removed',
    ForceProbeExecution = 'force-probe-execution',
    FullDisplayName = 'full-display-name',
    FullEnvironment = 'full-environment',
    GeneratedFilesForSource = 'generated-files-for-source',
    Groups = 'groups',
    Hello = 'hello',
    Install = 'install',
    InstallDone = 'install-done',
    IsEnabled = 'is-enabled',
    IsRunnable = 'is-runnable',
    Items = 'items',
    KeepGoing = 'keep-going',
    Line = 'line',
    Location = 'location',
    LogData = 'log-data',
    LogLevel = 'log-level',
    MaxJobCount = 'max-job-count',
    MaxProgress = 'max-progress',
    Message = 'message',
    ModuleProperties = 'module-properties',
    Name = 'name',
    NewMaxProgress = 'new-max-progress',
    OverriddenProperties = 'overridden-properties',
    ProcessResult = 'process-result',
    Product = 'product',
    Products = 'products',
    ProfileData = 'profile-data',
    Progress = 'progress',
    ProjectBuilt = 'project-built',
    ProjectCleaned = 'project-cleaned',
    ProjectData = 'project-data',
    ProjectDone = 'build-done',
    ProjectFilePath = 'project-file-path',
    ProjectResolved = 'project-resolved',
    Properties = 'properties',
    ProtocolError = 'protocol-error',
    Qbs = 'qbs',
    RunEnvironment = 'run-environment',
    SettingsDirectory = 'settings-directory',
    SourceArtifacts = 'source-artifacts',
    SourceArtifactsFromWildcards = 'source-artifacts-from-wildcards',
    StdErr = 'stderr',
    StdOut = 'stdout',
    SubProjects = 'sub-projects',
    Success = 'success',
    TargetExecutable = 'target-executable',
    TaskProgress = 'task-progress',
    TaskStarted = 'task-started',
    TopLevelProfile = 'top-level-profile',
    Type = 'type',
    Warning = 'warning',
    WorkingDirectory = 'working-directory',
}

export enum QbsCppKey {
    CLanguageVersion = 'cpp.cLanguageVersion',
    CompilerDefinesByLanguage = 'cpp.compilerDefinesByLanguage',
    CompilerIncludePaths = 'cpp.compilerIncludePaths',
    CompilerName = 'cpp.compilerName',
    CompilerPath = 'cpp.compilerPath',
    CompilerPathByLanguage = 'cpp.compilerPathByLanguage',
    CompilerVersionMajor = 'cpp.compilerVersionMajor',
    CompilerVersionMinor = 'cpp.compilerVersionMinor',
    CompilerVersionPatch = 'cpp.compilerVersionPatch',
    CxxLanguageVersion = 'cpp.cxxLanguageVersion',
    Defines ='cpp.defines',
    DistributionIncludePaths = 'cpp.distributionIncludePaths',
    FrameworkPaths = 'cpp.frameworkPaths',
    IncludePaths = 'cpp.includePaths',
    PlatformDefines = 'cpp.platformDefines',
    PrefixHeaders = 'cpp.prefixHeaders',
    SystemFrameworkPaths = 'cpp.systemFrameworkPaths',
    SystemIncludePaths = 'cpp.systemIncludePaths',
}

export enum QbsQbsKey {
    Architecture = 'qbs.architecture',
    Toolchain = 'qbs.toolchain',
}

export enum QbsDebuggerKey {
    Configutations = 'configurations',
    Cwd = 'cwd',
    Environment = 'environment',
    ExternalConsole = 'console',
    IsAutomatic = 'is-automatic',
    MiDebuggerPath = 'miDebuggerPath',
    MiMode = 'MIMode',
    Name = 'name',
    Program = 'program',
    Request = 'request',
    Type = 'type',
}

export enum QbsQbsProfileDataKey {
    Architecture = 'architecture',
    ConfigurationName = 'configurationName',
    TargetPlatform = 'targetPlatform',
    ToolchainType = 'toolchainType',
}
