import * as path from 'path';

import { isChildOf } from '../qbsutils';

import { QbsProtocolSourceArtifactData } from '../protocol/qbsprotocolsourceartifactdata';

export class QbsFolderData {
    private readonly folders: QbsFolderData[]
    private readonly sources: QbsProtocolSourceArtifactData[]

    public constructor(
        allSources: QbsProtocolSourceArtifactData[],
        private readonly fsPath: string) {

        this.folders = allSources
            .map(artifactData => {
                return path.dirname(artifactData.getFilePath() || "");
            })
            .filter(fsPath => {
                if (fsPath && (fsPath.length > 0))
                    return isChildOf(fsPath, this.fsPath);
            })
            .map(fsPath => {
                const parts = path.relative(this.fsPath, fsPath).split(path.sep);
                return (parts.length > 0) ? path.join(this.fsPath, parts[0]) : "";
            }).filter((fsPath, index, self) => {
                return (fsPath && (index === self.indexOf(fsPath)));
            }).map(fsPath => {
                return new QbsFolderData(allSources, fsPath);
            });

        this.sources = allSources.filter(artifactData => {
            const fsPath = artifactData.getFilePath();
            if (fsPath)
                return (path.normalize(path.dirname(fsPath)) === path.normalize(this.fsPath));
        });
    }

    public getFolders(): QbsFolderData[] { return this.folders; }
    public getSources(): QbsProtocolSourceArtifactData[] { return this.sources; }
    public getPath(): string { return this.fsPath; }
    public getName(): string { return path.basename(this.fsPath); }
}
