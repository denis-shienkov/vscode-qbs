# What's New?

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
