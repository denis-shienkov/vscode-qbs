// From the launch configuration.
export type QbsLaunchEnvironment = { name: string, value: string }[];
// From the Qbs engine or the VSCode terminal.
export type QbsProcessEnvironment = { [key: string]: string };

enum QbsLaunchEnvironmendKey {
    Name = 'name',
    Value = 'value',
}

export function toProcessEnvironment(env?: QbsLaunchEnvironment): QbsProcessEnvironment | undefined {
    if (!env)
        return;
    let result: QbsProcessEnvironment = {};
    env.forEach(function (data) {
        const k = data[QbsLaunchEnvironmendKey.Name];
        const v = data[QbsLaunchEnvironmendKey.Value];
        result[k] = v;
    });
    return result;
}

export function toLaunchEnvironment(env?: QbsProcessEnvironment): QbsLaunchEnvironment {
    if (!env)
        return [];
    return Object.entries(env).map(function ([k, v]) {
        let entry: any = {};
        entry[QbsLaunchEnvironmendKey.Name] = k;
        entry[QbsLaunchEnvironmendKey.Value] = v;
        return { name: k, value: v };
    });
}
