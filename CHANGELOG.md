# What's New?

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
Right now the QBS messaging console has been removed and all QBS
messages are now forwarded to the QBS build console.
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
Rignt now the unreferenced QBS files are displayed in the project
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
Implemented opening of QBS files with a specified line number.
- [#14](https://github.com/denis-shienkov/vscode-qbs/issues/14)
Implemented highlighting for QBS files.
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
- Implemented a basic set of QBS properties as the extension settings.
- Implemented the intelli sense highlighting of the source code.
- Added minimal basic documentation set.
- Implemented the progress bars indicating the `resolve`, `build`,
`clean`, and `install` operations.
- Implemented the progress bar indicating the session status.
- Added two output panes for the QBS compile and trace outputs.
- Implemented the run terminal.
- Implemented the debugger engine support.
