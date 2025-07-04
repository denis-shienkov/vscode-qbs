/** Qbs profile filter data, obtained from the `qbs-profiles.json` file. */

export class QbsSpecificBuildProfileFilterData {
    public constructor(
        public readonly name: string) { }
}

export class QbsAllBuildProfileFilterData {
    public constructor(
        public readonly version: string,
        public readonly profiles: QbsSpecificBuildProfileFilterData[]) { }
}
