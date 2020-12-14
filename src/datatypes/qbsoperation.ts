export enum QbsOperationStatus { Started, Completed, Failed }
export enum QbsOperationType { Resolve, Build, Clean, Install }

export class QbsOperation {
    constructor(
        readonly _type: QbsOperationType,
        readonly _status: QbsOperationStatus,
        readonly _elapsed: number) {}
}
