import { QbsProtocolDataKey } from './qbsprotocoldatakey';
import { QbsProtocolLocationData } from './qbsprotocollocationdata';
import { QbsProtocolProductData } from './qbsprotocolproductdata';
import { QbsProtocolProfileData } from './qbsprotocolprofiledata';

/** Helper data type for wrapping the project object for Qbs protocol. */
export class QbsProtocolProjectData {
    public constructor(private readonly data: any) { }

    public getBuildDirectory(): string | undefined {
        return this.data[QbsProtocolDataKey.BuildDirectory];
    }

    public getBuildSystemFiles(): string[] {
        return this.data[QbsProtocolDataKey.BuildSystemFiles] || [];
    }

    public getData(): any { return this.data; }

    public getIsEmpty(): boolean { return !this.data; }

    public getIsEnabled(): boolean | undefined {
        return this.data[QbsProtocolDataKey.IsEnabled];
    }

    public getLocation(): QbsProtocolLocationData | undefined {
        const data = this.data[QbsProtocolDataKey.Location];
        return (data) ? new QbsProtocolLocationData(data) : undefined;
    }

    public getName(): string | undefined { return this.data[QbsProtocolDataKey.Name]; }

    public getProducts(): QbsProtocolProductData[] {
        return (this.data[QbsProtocolDataKey.Products] || [])
            .map((data: any) => new QbsProtocolProductData(data));
    }

    public getProfile(): QbsProtocolProfileData | undefined {
        const data = this.data[QbsProtocolDataKey.ProfileData];
        if (data) {
            for (var name in data)
                return new QbsProtocolProfileData(name, data[name]);
        }
        return undefined;
    }

    public getSubProjects(): QbsProtocolProjectData[] {
        return (this.data[QbsProtocolDataKey.SubProjects] || [])
            .map((data: any) => new QbsProtocolProjectData(data));
    }

    public getAllRecursiveProducts(): QbsProtocolProductData[] {
        const products: QbsProtocolProductData[] = [];
        const extractProducts = (project: QbsProtocolProjectData) => {
            products.push(...project.getProducts());
            const projects = project.getSubProjects();
            projects.forEach((project: QbsProtocolProjectData) => extractProducts(project));
        }
        extractProducts(this);
        return products;
    }

    public setBuildSystemFiles(files?: string[]) {
        if (files)
            this.data[QbsProtocolDataKey.BuildSystemFiles] = files;
    }

    public setProfile(profile?: QbsProtocolProfileData) {
        if (profile)
            this.data[QbsProtocolDataKey.ProfileData] = profile.toMap();
    }

    public setBuildDirectory(buildDirectory?: string): void {
        if (buildDirectory)
            this.data[QbsProtocolDataKey.BuildDirectory] = buildDirectory;
    }
}
