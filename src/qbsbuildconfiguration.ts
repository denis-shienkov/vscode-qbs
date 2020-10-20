export class QbsBuildConfiguration {
    constructor(readonly _name: string) {
    }

    name(): string {
        return this._name;
    }

    /**
     * Returns the list of all available QBS build configuration names.
     *
     * @note Right now these are just two hardcoded configurations
     * @c debug and @c release.
     */
    static async enumerateConfigurations(): Promise<QbsBuildConfiguration[]> {
        let configurations = [];
        configurations.push(new QbsBuildConfiguration('debug'));
        configurations.push(new QbsBuildConfiguration('release'));
        return configurations;
    }
}
