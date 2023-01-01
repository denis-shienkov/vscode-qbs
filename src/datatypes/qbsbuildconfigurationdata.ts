/** Qbs configuration data, obtained from the `qbs-configurations.json` file. */
export class QbsBuildConfigurationData {
    public constructor(
        public readonly name: string,
        public readonly displayName?: string,
        public readonly description?: string,
        public readonly properties?: { [key: string]: string }) { }
}
