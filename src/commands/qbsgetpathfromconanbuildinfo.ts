import * as ini from 'ini';
import * as fs from 'fs';
import * as path from 'path';
import { QbsSession } from "../qbssession";

export async function getPathFromConanBuildInfo(session: QbsSession, section: string, option: string): Promise<string | null> {
    const buildDir = session.settings().buildDirectory();
    const buildInfoPath = path.join(buildDir, 'conanbuildinfo.txt');
    if (fs.existsSync(buildInfoPath)) {
        const data = ini.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
        if (section in data && option in data[section])
            return Promise.resolve(data[section][option].replaceAll('\\', '/'));
    }
    return Promise.resolve(null);
}