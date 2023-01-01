# Qbs: Build configurations and overridden properties

Qbs support the following set of default build
[configuration names](https://doc.qt.io/qbs/cli-build.html#config-configuration-op-op-name)
`release`, `debug`, `profiling`.

Also the user can create its own custom build configuration
names with the specific set of an overridden properties.

Qbs allows to override any project properties on the
resolving stage. Details about the data format for this
can be found in the official Qbs
[documentation](https://doc.qt.io/qbs/language-introduction.html#overriding-property-values-from-the-command-line).

Although, this extension allows you to do this using
a special `qbs-configurations.json` file.

A data format in this file corresponds to the official
Qbs documentation, the link to which is given above.

When this Qbs extension starts, it creates the default
`qbs-configurations.json` file containing all default
buid configurations. The user can extend this file by its
purposes. When the file is changed, the Qbs extension will
automatically start resolving the active Qbs project
with the new configurations and properties set in the file.

## Create build configurations

You can to call the **Qbs: Edit Build Configurations** command
from the command palette. This command will create the default
`qbs-configurations.json` file, if it does not exist,
and then will open this file in the editor.

To actualize the build configurations, run the
**Qbs: Scan Build Configurations** command, which re-reads the
`qbs-configurations.json` file.

By default this file creates in the current project
workspace folder, located at
`<path/to/your/project/.vscode/qbs-configurations.json>`.

The default contents of this configuration file looks
like this:

```json
[
    {
        "name": "release",
        "displayName": "Release",
        "description": "Build with optimizations.",
        "properties": {
            "qbs.buildVariant": "release"
        }
    },
    {
        "name": "debug",
        "displayName": "Debug",
        "description": "Build with debug information.",
        "properties": {
            "qbs.buildVariant": "debug"
        }
    },
    {
        "name": "profiling",
        "displayName": "Profiling",
        "description": "Build with optimizations and debug information.",
        "properties": {
            "qbs.buildVariant": "profiling"
        }
    }
]
```

The user can edit, remove, or add the other configurations.

## Specify overriden properties

It is possible to specify a list of custom properties passed
to the Qbs at resolve step for each build configuration
separatelly using the `properties` item.

For example, the possible configuration might look like this:

```json
[
    {
        "name": "my-cool-config",
        "displayName": "My Cool Config",
        "description": "Enable something and override something.",
        "properties": {
            "projects.someProject.projectProperty": false,
            "products.someProduct.productProperty": false,
            "modules.cpp.treatWarningsAsErrors": true,
            "products.someProduct.cpp.treatWarningsAsErrors": true,
            "projects.someProject.listProp: ["a", "b", "c"]
        }
    }
]
```
