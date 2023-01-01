/** Helper enumeration for wrapping the request types for Qbs protocol. */
export enum QbsProtocolRequestType {
    Build = 'build-project',
    Cancel = 'cancel-job',
    Clean = 'clean-project',
    GetRunEnvironment = 'get-run-environment',
    Install = 'install-project',
    Resolve = 'resolve-project',
}
