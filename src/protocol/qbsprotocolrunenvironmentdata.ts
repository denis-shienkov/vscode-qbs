/** Helper data type for wrapping the run environmend object for Qbs protocol. */
export class QbsProtocolRunEnvironmentData {
    public constructor(private readonly data: { [key: string]: string }) { }
    public getData(): { [key: string]: string } { return this.data; }
}
