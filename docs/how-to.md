# How To

This page links to documentation for common tasks.

## Prepare QBS

* Download the latest [QBS](https://download.qt.io/official_releases/qbs/) release
or install from the repository.
* Configure the desired QBS build [profiles](https://doc.qt.io/qbs/configuring.html).
* Run the `qbs config --list profiles` to make sure that the profiles
are successfully configured.

## Open a project

* From the command palette in VS Code, run the **File: Open Folder** command
in a directory that does have a `*.qbs` project file.
* From the command palette in VS Code, run the **QBS: Select Project** command
and select the desired `*.qbs` project file in the current directory.

## Configure a project

* From the command palette in VS Code, run the **QBS: Select Profile** command
to choose the desired build profile.
* From the command palette in VS Code, run the **QBS: Select Configuration** command
to choose the desired build configuration (only `debug` or `release` are supported yet).
* From the command palette in VS Code, run the **QBS: Select Build Product** command
to choose the desired product to build (or `[all]` to build all products in the project).

## Build a project

* From the command palette in VS Code, run the **QBS: Build** command,
or press the **Build** button in the status bar.

## Run a product

* From the command palette in VS Code, run the **QBS: Select Run Product** command
to select the desired product to run.
* From the command palette in VS Code, run the **QBS: Run** command,
or press the **Run** button in the status bar.

## Debug a product

* From the command palette in VS Code, run the **QBS: Select Run Product** command
to select the desired product to debug.
* From the command palette in VS Code, run the **QBS: Select Debugger** command,
to select the desired debugegr configuration for debugging.
* From the command palette in VS Code, run the **QBS: Debug** command,
or press the **Debug** button in the status bar.

## Set up include paths for C++ IntelliSense

QBS currently supports Microsoft's `ms-vscode.cpptools` extension. If this extension
is installed and enabled, then configuring your project will provide this integration
automatically.

The `ms-vscode.cpptools` will show a prompt confirming that you wish to use QBS to
provide the configuration information for your project. Accept this prompt to activate
the integration. Subsequently, QBS will provide and automatically update cpptools
configuration information for each source file in your project.

## Next steps

- Explore the [CMake Tools documentation](README.md)
