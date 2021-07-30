export class QbsConfigData {
    constructor(
        private readonly _name: string,
        private readonly _displayName?: string,
        private readonly _description?: string,
        private readonly _props?: any) {}

    name(): string {
        return this._name;
    }

    displayName(): string | undefined {
        return this._displayName;
    }

    description(): string | undefined {
        return this._description;
    }

    overriddenProperties(): any | undefined {
        return this._props;
    }
}
