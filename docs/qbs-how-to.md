# How To

This page links to documentation for common tasks.

## Prepare Qbs

* Download the latest [Qbs](https://download.qt.io/official_releases/qbs/)
release or install from the repository.
* Configure the desired Qbs build [profiles](https://doc.qt.io/qbs/configuring.html).
* Run the `qbs config --list profiles` to make sure
that the profiles are successfully configured.

## Open a project

* From the command palette in VS Code, run the **File: Open Folder**
command in a directory that does have a `*.qbs` project file.
* From the command palette in VS Code, run the **Qbs: Load Project**
command and select the desired `*.qbs` project file in the
current directory.
* From the command palette in VS Code, run the **Qbs: Save Project**
command to save a selected project configuration.

## Configure a project

* From the command palette in VS Code, run the **Qbs: Select Build Profile**
command to choose the desired build profile.
* From the command palette in VS Code, run the **Qbs: Select Build Configuration**
command to choose the desired build configuration.
* From the command palette in VS Code, run the **Qbs: Select Build Product**
command to choose the desired product to build (or `ALL` to
build all products in the project).

## Build a project

* From the command palette in VS Code, run the **Qbs: Build**
command, or press the **Build** button in the status bar to
build the selected product or all project.

## Run a product

* From the command palette in VS Code, run the **Qbs: Select Run Product**
command to select the desired product to run.
* From the command palette in VS Code, run the **Qbs: Run**
command, or press the **Run** button in the status bar.

## Debug a product

* From the command palette in VS Code, run the **Qbs: Select Run Product**
command to select the desired product to debug.
* From the command palette in VS Code, run the **Qbs: Select Launch Configuration**
command, to select the desired launch configuration
for debugging.
* From the command palette in VS Code, run the **Qbs: Debug**
command, or press the **Debug** button in the status bar.

## Edit a build configurations

* From the command palette in VS Code, run the **Qbs: Edit Build Configurations**
command, which will create the `qbs-configurations.json`
file.
* Add desired build configurations and the overridden properties
to this `qbs-configurations.json` file, and save it.
* When the `qbs-configurations.json` file is changed,
the project will automatically resolved with the new build
configurations.

## Edit a launch configurations

* From the command palette in VS Code, run the **Qbs: Edit Launch Configurations**
command, which will create the `launch.json` file.
* Add desired launch configurations to this `launch.json`
file, and save it.

## Add a build profiles filter

* From the command palette in VS Code, run the **Qbs: Edit Build Profiles Filter**
command, which will create the `qbs-profiles.json` file.
* Refine the list to contain desired build profiles which 
should be listed in the **Qbs: Select Build Profile** command.

## Set up include paths for C++ IntelliSense

Qbs currently supports Microsoft's `ms-vscode.cpptools`
extension. If this extension is installed and enabled, then
configuring your project will provide this integration
automatically.

The `ms-vscode.cpptools` will show a prompt confirming that
you wish to use Qbs to provide the configuration information
for your project. Accept this prompt to activate the integration.
Subsequently, Qbs will provide and automatically update cpptools
configuration information for each source file in your project.

## Next steps

- Explore the [Qbs extension documentation](README.md)
