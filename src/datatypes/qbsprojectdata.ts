import {QbsDataKey} from './qbskeys';
import {QbsLocationData} from './qbslocationdata';
import {QbsProductData} from './qbsproductdata';
import {QbsProfileData} from './qbsprofiledata';

export class QbsProjectData {
    constructor(private readonly _data: any) {}

    id(): string {
        return this.buildDirectory();
    }

    name(): string {
        return this._data[QbsDataKey.Name];
    }

    buildDirectory(): string {
        return this._data[QbsDataKey.BuildDirectory];
    }

    location(): QbsLocationData {
        return new QbsLocationData(this._data[QbsDataKey.Location]);
    }

    profile(): QbsProfileData {
        return new QbsProfileData(this._data[QbsDataKey.ProfileData]);
    }

    isEmpty():boolean {
        return this._data === undefined;
    }

    data(): any {
        return this._data;
    }

    products(): QbsProductData[] {
        const products: QbsProductData[] = [];
        const datas: any[] = this._data[QbsDataKey.Products] || [];
        datas.forEach(data => products.push(new QbsProductData(data)));
        return products;
    }

    subProjects(): QbsProjectData[] {
        const projects: QbsProjectData[] = [];
        const datas: any[] = this._data[QbsDataKey.SubProjects] || [];
        datas.forEach(data => projects.push(new QbsProjectData(data)));
        return projects;
    }

    allProducts(): QbsProductData[] {
        const products: QbsProductData[] = [];
        const extractProducts = (project: QbsProjectData) => {
            products.push(...project.products());
            const projects = project.subProjects();
            projects.forEach(project => extractProducts(project));
        }
        extractProducts(this);
        return products;
    }

    setBuildSystemFiles(files: any) {
        this._data[QbsDataKey.BuildSystemFiles] = files;
    }

    buildSystemFiles(): any {
        return this._data[QbsDataKey.BuildSystemFiles];
    }

    setProfile(profile: QbsProfileData) {
        let data: any = {};
        const n = profile.name();
        data[n] = profile.data();
        this._data[QbsDataKey.ProfileData] = data;
    }
}
