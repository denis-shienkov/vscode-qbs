# Qbs: Build

Once as you open the directory with the file `*.qbs` project file,
the Qbs extension is automatically initialized, and then starts
the Qbs session.

You can make sure that the Qbs session is initialized successfully
by looking at the caption `Qbs: Started` on the corresponding button
on the status bar:

![Qbs session status button](images/qbs-session-status-button.png)

If something goes wrong, the user can manually restart the Qbs session
using the following commands:

* From the command palette in VS Code, run the **Qbs: Stop Session** command
to stop the session.

* From the command palette in VS Code, run the **Qbs: Start Session** command
to start the session.

* From the command palette in VS Code, run the **Qbs: Restart Session**
command to restart the session (performs the stop and the start sequence
automatically).

## Select a project

When the workspace folder with the Qbs project files is opened in
the VS Code, the Qbs extension automatically sets a previously used
Qbs project as an active project. Also the Qbs extension tries to
restore that project's configuration (such as an build profile, build
configuration, build product, run product and the debugger). In case
the previous Qbs project does not exists or the restore fails, the
Qbs extension tries to set the first Qbs project file from the
selected workspace folder as the active Qbs project.

The Qbs allows to have a multiple Qbs project files in the same
directory. The user can choose one of them:

* From the command palette in VS Code, run the **Qbs: Load Project** command,
or press the **Click to Select the Active Project** button in the status bar.

When the Qbs active project is selected, its name will be displayed
in the corresponding button caption:

![Qbs select active project button](images/qbs-select-active-project-button.png)

## Resolve a project

When the Qbs active project is selected, the Qbs extension automatically
starts the project resolving operation using the last restored build
confguration for this active Qbs project (or with the default build
configuration if the Qbs project was open at first time).

This resolve operation scans the project dependencies and creates the
build tree.

The progress of this operation is displayed in the corresponding
popup message:

![Qbs project resolving message](images/qbs-project-resolving-popup.png)

The user can start the resolving manually:

* From the command palette in VS Code, run the **Qbs: Resolve** or
the **Qbs: Resolve and Force Probe Execution **command.

## Configure a project

The procedure for configuring a Qbs project is to select the desired
`build`, `build`, and `product` for building:

* To select the build profile, from the VS Code command pallette
run the **Qbs: Select Build Profile** command, or press the
**Click to Select the Build Profile** button in the status bar:

![Qbs select build profile button](images/qbs-select-profile-button.png)

* To select the build configuration, from the VS Code command pallette
run the **Qbs: Select Build Configuration** command, or press the
**Click to Select the Build Configuration** button in the status bar:

![Qbs select build configuration button](images/qbs-select-configuration-button.png)

Also it is possible to edit the build configurations and override the
build properties, run the **Qbs: Edit Build Configurations* command.

Currently the default `release`, `debug`, `profiling` are supported by
the Qbs internally. Also, the user can create its own custom build
[configurations](qbs-configurations.md).

* To select the build product, from the VS Code command pallette
run the **Qbs: Select Build Product** command, or press the
**Click to Select the Product to Build** button in the status bar:

![Qbs select build product button](images/qbs-select-build-product-button.png)

You can choose to build either one product or `ALL` products of
the active Qbs project.

When any of these configurations (e.g. build profile, build
configuration, build product) change, then the Qbs extension starts
the project resolving again.

The progress of this resolving operation is displayed in the
corresponding popup message:

![Qbs project resolving message](images/qbs-project-resolving-popup.png)

## Build a project

To build the selected Qbs product, from the VS Code command pallette
run the **Qbs: Build** command, or press the **Build** button in
the status bar:

![Qbs build project button](images/qbs-build-project-button.png)

The progress of this building operation is displayed in the
corresponding popup message:

![Qbs project building message](images/qbs-project-building-popup.png)

## Clean a project

To clean the selected Qbs product from all generated build artifacts,
from the VS Code command pallette run the **Qbs: Clean** command.

The progress of this cleaning operation is displayed in the
corresponding popup message:

![Qbs project cleaning message](images/qbs-project-cleaning-popup.png)

## Cancel an operation

To cancel the current active long-time operation from the VS Code
command pallette run the **Qbs: Cancel Operation** command or click
on the **Cancel** button in the progress popup.

## Watch for output

The progress of operations such as `resolving`, `building`, and
`cleaning' is also displayed as text messages reported from Qbs.

The Qbs extension provides one output `Qbs` channel for displaying
the messages:

* **Qbs** - displays the messages of the main build, clean and
resolve processes, and also the internal service messages
(e.g. comes from the JS engine of Qbs):

![Qbs compile output pane](images/qbs-compile-output-pane.png)

## Next steps

- Explore the [Qbs extension documentation](README.md)
