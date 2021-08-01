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
start resolving the project with the new configurations and overridden properties.

## Create a configurations

You can to call the `Edit Build Configuration` command from the command palette.
This command will create the default `qbs-configurations.json` file (if it is not
exists yet), and then will open this file in the editor. By default this file
will be created in the current project workspace folder, along the path
`<path/to/your/project/.vscode/qbs-configurations.json>`.

The default format of this file is the following:

```json
[
    {
        "name": "release",
        "display-name": "Release",
        "description": "Enable optimizations.",
        "overridden-properties": {}
    },
    {
        "name": "debug",
        "display-name": "Debug",
        "description": "Disable optimizations.",
        "overridden-properties": {}
    },
    {
        "name": "profiling",
        "display-name": "Profiling",
        "description": "Enable profiling.",
        "overridden-properties": {}
    }
]
```

The user can edit, remove, or add the other ocnfigurations.


## Override a properties

It is possible to specify a set of the custom overridden properties
for each build configuration using the `overridden-properties` item.

For example, the possible configuration might look like this:

```json
[
    {
        "name": "my-cool-config",
        "display-name": "My Cool Config",
        "description": "Enable something and override something.",
        "overridden-properties": {
            "projects.someProject.projectProperty": false,
            "products.someProduct.productProperty": false,
            "modules.cpp.treatWarningsAsErrors": true,
            "products.someProduct.cpp.treatWarningsAsErrors": true,
            "projects.someProject.listProp: ["a", "b", "c"]
        }
    }
]
```
