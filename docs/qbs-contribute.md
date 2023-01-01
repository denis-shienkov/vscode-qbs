# How to Contribute to Qbs

This article is for developers who want to contribute
to the Qbs open source project.

## Build the Qbs extension

As with most VS Code extensions, you'll need [Node.JS](https://nodejs.org/en/)
installed. Also we use [gulp](https://gulpjs.com/) to compile the code.

The process is:

1. Download the sources of the Qbs extension.

2. Open the source root Qbs extension folder in VS Code.

3. Call `npm install` at project root to install
dependencies (this can be done from the VS Code
terminal view).

4. Call `npm run compile` to compile the extension.

5. Call `npm run package` to build the whole extension
package (including the localizations).

6. Call `npm run clean` to cleanup the all generated
output artifacts.

## Coding guidelines

### Formatting

Code is formatted using `clang-format`. We recommend
you install the [Clang-Format extension](https://marketplace.visualstudio.com/items?itemName=xaver.clang-format).
