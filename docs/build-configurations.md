# QBS: Build configurations and overridden properties

QBS support the following set of pre-defined build [configuration names](https://doc.qt.io/qbs/cli-build.html#config-configuration-op-op-name)
`release`, `debug`, `profiling`.

Also the user can create its own custom build configuration names with
the specific set of an overridden properties.

QBS allows to override any project properties on the resolving stage. Details
about the data format for this can be found in the official QBS [documentation](https://doc.qt.io/qbs/language-introduction.html#overriding-property-values-from-the-command-line).

Although, this extension allows you to do this using a special
`qbs-configurations.json` file. The data format in this file corresponds to
the official documentation, the link to which is given above.

When this extension starts, it creates by default the `qbs-configurations.json`
file containing all pre-defined buid configurations. The user can extend this
file by its purposes. When the file is changed, the extension will automatically
start resolving the project with the new configurations and properties set in the file.

## Edit configurations

You can to call the `Edit Build Configuration` command from the command palette.
This command will create the default `qbs-configurations.json` file if it does not exist, and then will open this file in the editor. By default this file
will be created in the current project workspace folder, located at
`<path/to/your/project/.vscode/qbs-configurations.json>`.

The default contents of this file looks like this:

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

## Specify Qbs properties

It is possible to specify a list of custom properties passed to Qbs
at resolve step for each build configuration using the `properties` item.

For example, possible configuration might look like this:

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
