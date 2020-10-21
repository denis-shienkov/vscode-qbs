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
or select the **Build** button in the status bar.
