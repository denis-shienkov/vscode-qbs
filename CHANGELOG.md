# What's New?

## 2.1.6

- [#79](https://github.com/denis-shienkov/vscode-qbs/issues/79)
Fixed that, artifacts with a long paths are displayed as a view
with the hierarchical subfolders in the project tree.

## 2.1.5

 - Added new **Qbs: Export Build Profiles** command to
export build profiles to a file.
 - Added new **Qbs: Import Build Profiles** command to
import build profiles from a file.
 - Changed format of the `qbs-configurations.json` file
that allows to specify an additional common build properties
for any build configuration.

## 2.1.4

- Added some details for the build products in the build
product selector (such as product type and so on).
- Added displaying for the full target executable path in the
run product selector.
- [#73](https://github.com/denis-shienkov/vscode-qbs/issues/73)
Right now are used the arguments from the `launch.json` file when
launching the target program.
- [#72](https://github.com/denis-shienkov/vscode-qbs/issues/72)
Fixes setting the environment for the application running
or debugging.

## 2.1.3

- Fixed that sets the default `debug` configuration name for Qbs
projects which are open at first time.
- Removed extra quotes in properties of detected build profiles.

## 2.1.2

- Added the new setting `qbs.showEmptyProjectGroups` to show all empty
project groups.
- Improved parsing for GCC toolchain messages as diagnostic problems.
- Improved parsing for IAR EW toolchain messages as diagnostic problems.
- Improved parsing for SDCC toolchain messages as diagnostic problems.
- Improved parsing for Clang-Cl toolchain messages as diagnostic problems.
- Implemented parsing for Watcom toolchain messages as diagnostic problems.
- Implemented parsing for Clang toolchain messages as diagnostic problems.

## 2.1.1

- Implemented parsing for MSVC linker errors as diagnostic problems.
- Improved parsing for IAR EW toolchain errors as diagnostic problems.
- [#71](https://github.com/denis-shienkov/vscode-qbs/issues/71)
Fixed scanning for empty build profiles (e.g. created as
`qbs-config profiles.empty undefined`).

## 2.1.0

- [#66](https://github.com/denis-shienkov/vscode-qbs/issues/66)
Added support for resolve/build/clean/install/rebuild tasks.

## 2.0.2

- [#70](https://github.com/denis-shienkov/vscode-qbs/issues/70)
Fixed scanning for build profiles on Mac OSX.

## 2.0.1

- Fixed the documentation links.

## 2.0.0

- The extension code has been completely refactored, which may
break the compatibility with the previous 1.x. versions.
- [#21](https://github.com/denis-shienkov/vscode-qbs/issues/21)
Added `Run` context menu for the product in the project tree
to launch the product in the terminal.
- [#21](https://github.com/denis-shienkov/vscode-qbs/issues/21)
Added `Debug` context menu for the product in the project tree
to debug the product.
- Updated the nodes icons in the project tree.
- Updated the documentation.
- Changed the set of a commands and their names.
- Added new **Qbs: Edit Launch Configurations** command to edit
the `launch.json` file.
- Added new **Qbs: Scan Launch Configurations** command to update
the launch configurations selection entries.
- Added new **Qbs: Edit Build Configurations** command to edit
the `qbs-configurations.json` file.
- Added new **Qbs: Scan Build Configurations** command to update
the build configurations selection entries.
- Added new **Qbs: Scan Build Profiles** command which calls
the Qbs executable to scan the available Qbs build profiles
(aka toolchains).
- Implemented compilation for single source file, selected from
the project explorer tree.
- Added new `installAfterBuild` Qbs extension setting.
- Right now it is possible to select the default build profile
from the build profiles selector.

## 1.0.7

- [#69](https://github.com/denis-shienkov/vscode-qbs/issues/69)
Added the new setting `qbs.saveBeforeBuild` for saving the open
documents before resolving or building.
- [#63](https://github.com/denis-shienkov/vscode-qbs/issues/63)
Added the new setting `qbs.autoResolve` to control the automatic
resolving of a project when its build files are modified.
- [#64](https://github.com/denis-shienkov/vscode-qbs/issues/64)
Added the new setting `qbs.buildBeforeRun` to control the build
stage of the product before it launches.
- Implemented redirection of messages when detecting profiles to
the Qbs channel.
- Profiles detection command added to the profile selector as
the first `[Detect profiles]` item.
- Right now the Qbs configuration entry name replaced with the
`Qbs Tools`.

## 1.0.6

- [#60] (https://github.com/denis-shienkov/vscode-qbs/issues/60)
Added the command substitutions such as `qbs.getBuildDirectory`
and `qbs.getSelectedProductPath`.

## 1.0.5

- Added the project name `${projectName}` substitution.
- Fixed displaying for the 'note' and 'remark' messages in the `problems`
pane with the 'information' severity level for the GCC toolchains.
- Fixed displaying for the 'fatal error' messages in the `problems`
pane with the 'error' severity level for the IAR toolchains.
- Fixed displaying for the error or warning codes in the `problems`
pane for the ARMCC compiler from the KEIL toolchain.
- Fixed displaying for the 'fatal error' messages in the `problems`
pane for the ARMCLANG compiler from the KEIL toolchain.
- Fixed displaying for the 'fatal error' messages in the `problems`
pane for the Clang-Cl compiler.
- Fixed displaying for the 'fatal error' messages in the `problems`
pane for the MSVC compiler.
- Fixed displaying for the 'fatal error' messages in the `problems`
pane for the SDCC compiler.
- Added displaying the error and warning messages in the `problems`
pane for the COSMIC toolchains.

## 1.0.4
- Default `qbs-configurations.json` file is not created unless user runs
the `Edit Build Configuration` command.
- Format of the `qbs-configurations.json` has changed - `display-name` and
`overridden-properties` were renamed to `displayName` and `properties`,
  respectively. Old format also supported.
- Right now the `qbs.buildVariant` sets explicitly for the all default
`release`, `debug`, and `profiling` configurations.
- Added support for the missing `none` configuration profile.
- [#55](https://github.com/denis-shienkov/vscode-qbs/issues/55)
Handling the wildcards source artifacts for the proper intellisense.

## 1.0.3

- Next bug-fix release.
- [#52](https://github.com/denis-shienkov/vscode-qbs/issues/52)
Right now need to use the `qbs-configurations.json` file instead
of the `overriden-properties.json` file to specify the build
configurations and its overridden properties.

## 1.0.2

- Next bug-fix release.
- Added the missing russian translation for the `re-build` command.
- Changed default value for `qbs.showDisabledProjectItems` setting
to `true`.
- Fixed the critical error of the previous release related to the
fully non-functional extension installed from the `*.vsix` package.

## 1.0.1

- Next bug-fix release.
- [#37](https://github.com/denis-shienkov/vscode-qbs/issues/37)
Fixed stealing of the focus from the editor at building.
- [#40](https://github.com/denis-shienkov/vscode-qbs/issues/40)
Fixed creation of a `overridden-properties.json` file when its
directory does not exist yet.
- Fixed parsing `launch.json` containing comments.
- Fixed working with debugger on Mac OSX.
- Improved elapsed time formatting in build logs.
- [#47](https://github.com/denis-shienkov/vscode-qbs/issues/47)
Right now the `Show command lines` setting renamed with `Command
echo mode` and makes as enumeration to support all modes such as
`command-line`, `command-line-with-environment`, `silent`, and
`summary`.
- [#46](https://github.com/denis-shienkov/vscode-qbs/issues/46)
Right now the Qbs messaging console has been removed and all Qbs
messages are now forwarded to the Qbs build console.
- [#48](https://github.com/denis-shienkov/vscode-qbs/issues/48)
Added the new setting `qbs.clearOutputBeforeOperation` for cleaning
the output console before resolving, cleaning, or building.
- Fixed retrieving the environment when switching debuggers.
- Disabled project items are now visible by default.

## 1.0.0

- First production release.
- [#31](https://github.com/denis-shienkov/vscode-qbs/issues/31)
Added option to show or hide the disabled project items.
- [#31](https://github.com/denis-shienkov/vscode-qbs/issues/31)
Rigt now the disabled project items are marked as striked text.
- [#2](https://github.com/denis-shienkov/vscode-qbs/issues/2)
Implemented the project re-resolving when the qbs/js files change.
- [#32](https://github.com/denis-shienkov/vscode-qbs/issues/32)
Right now it is possible to override the project properties which
are located in the `overriden-properties.json` file,  using the
`Override Project Properties` command.
- [#33](https://github.com/denis-shienkov/vscode-qbs/issues/33)
Rignt now the unreferenced Qbs files are displayed in the project
tree under the `Qbs files` node.
- [#34](https://github.com/denis-shienkov/vscode-qbs/issues/34)
Added integration of the `problems` panel with Qbs warning messages.

## 0.0.9

- Next developer preview release.
- [#29](https://github.com/denis-shienkov/vscode-qbs/issues/29)
Fixed updating debugger settings when its configuration file changed.
- [#30](https://github.com/denis-shienkov/vscode-qbs/issues/30)
Implemented ability to select the 'Auto' entry for the debugging.
- [#4](https://github.com/denis-shienkov/vscode-qbs/issues/4)
Right now the pre-defined compiler macros also reported for the
non-generic compilers (like KEIL, IAR, SDCC).
- [#26](https://github.com/denis-shienkov/vscode-qbs/issues/26)
Added basic integration of the `problems` panel with compilers
GCC/MINGW, MSVC, CLANG, SDCC, IAR, KEIL.
- Displayed additional information (architecture and type) for
detected profiles in a command palette.

## 0.0.8

- Next developer preview release.
- [#22](https://github.com/denis-shienkov/vscode-qbs/issues/22)
Added russian localization.
- [#24](https://github.com/denis-shienkov/vscode-qbs/issues/24)
Now, the macros and other properties from the groups are processed.

## 0.0.7

- Next developer preview release.
- [#22](https://github.com/denis-shienkov/vscode-qbs/issues/22)
Implemented opening of Qbs files with a specified line number.
- [#14](https://github.com/denis-shienkov/vscode-qbs/issues/14)
Implemented highlighting for Qbs files.
- [#23](https://github.com/denis-shienkov/vscode-qbs/issues/23)
Implemented saving of the selected debugger.

## 0.0.6

- Next developer preview release.
- Implemented the project explorer tree view.
- Added new `Detect Profiles` command.
- Implemented saving user selection (such as project, profile,
configuration and product).
- Removed the progress bar indicating the session status.

## 0.0.5

- Initial developer preview release.
- Implemented a basic set of commands (such as `resolve`, `build`,
`clean` and so forth).
- Implemented selection of the available project file using the
status bar button.
- Implemented selection of the available build profile using the
status bar button.
- Implemented selection of the build configuration using the
status bar button (by default are supported only the `debug` and
the `release` configurations yet).
- Implemented selection of the target product for building (or all
products) using the status bar button.
- Implemented selection of the target product for debugging and
running using the status bar button.
- Implemented selection of the desired debugger configuration
(specifies in the `launch.json` file).
- Implemented a basic set of Qbs properties as the extension settings.
- Implemented the intelli sense highlighting of the source code.
- Added minimal basic documentation set.
- Implemented the progress bars indicating the `resolve`, `build`,
`clean`, and `install` operations.
- Implemented the progress bar indicating the session status.
- Added two output panes for the Qbs compile and trace outputs.
- Implemented the run terminal.
- Implemented the debugger engine support.
