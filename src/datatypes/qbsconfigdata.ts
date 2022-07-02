export class QbsConfigData {
    constructor(
        readonly name: string,
        readonly displayName?: string,
        readonly description?: string,
        readonly properties?: {[key: string]: string},
        readonly profile?: string,
        readonly custom_properties?: {[key: string]: string}) {}
}
