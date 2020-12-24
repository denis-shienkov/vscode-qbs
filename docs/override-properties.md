# QBS: Override properties

QBS allows to override any project properties on the resolving stage. Details
about the data format for this can be found in the official QBS [documentation](https://doc.qt.io/qbs/language-introduction.html#overriding-property-values-from-the-command-line).

Although, this extension allows you to do this using a special
`overridden-properties.json` file. The data format in this file corresponds to
the official documentation, the link to which is given above.

## Configure

First you need to call the `Override Project Properties` comamnd from the
command palette. This command will open the `overridding-property.json` file,
which by default will be created in the current project workspace folder,
along the path `<path/to/your/project/.vscode/overridding-properties.json>`.

Next, you need to fill this file in the appropriate format, and then to save it.

For example, the possible configuration might look like this:

```json
{
    "projects.someProject.projectProperty": false,
    "products.someProduct.productProperty": false,
    "modules.cpp.treatWarningsAsErrors": true,
    "products.someProduct.cpp.treatWarningsAsErrors": true,
    "projects.someProject.listProp: ["a", "b", "c"]
}
```

When the file is saved, the extension will automatically start resolving the
project with new overridden properties.
