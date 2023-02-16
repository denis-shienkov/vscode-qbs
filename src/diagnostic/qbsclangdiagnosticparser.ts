import * as vscode from 'vscode';

import { QbsGccDiagnosticParser } from './qbsgccdiagnosticparser';
import { QbsToolchain } from '../protocol/qbsprotocolqbsmoduledata';

// Same as GCC parser.
export class QbsClangDiagnosticParser extends QbsGccDiagnosticParser {
    public constructor() {
        super();
        this.setToolchainType(QbsToolchain.Clang);
    }
}
