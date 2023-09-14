/** Qbs configuration data, obtained from the `qbs-configurations.json` file. */

export class QbsSpecificBuildConfigurationData {
    public constructor(
        public readonly name: string,
        public readonly displayName?: string,
        public readonly description?: string,
        public readonly properties?: { [key: string]: string }) { }
}

export class QbsAllBuildConfigurationData {
    public constructor(
        public readonly version: string,
        public readonly configurations: QbsSpecificBuildConfigurationData[],
        public readonly properties?: { [key: string]: string },
    ) { }
}
