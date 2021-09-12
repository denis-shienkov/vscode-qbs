# Configure QBS settings

QBS supports a variety of settings that can be set at the user, or workspace,
level via VSCode's `settings.json` file. This topic covers the available options
and how they are used.

Options that support substitution, in the table below, allow variable references
to appear in their strings. See [variable substitution](#variable-substitution),
below, for more information about variable expansion.

## QBS settings

|Setting  |Description | Default value | Supports substitution |
|---------|---------|---------|-----|
| `qbs.qbsPath`| Specify location of the QBS executable. | `qbs` (Causes QBS to search the `PATH` environment variable.) | Yes. |
| `qbs.settingsDirectory`| Specify location of the QBS [settings directory](https://doc.qt.io/qbs/cli-config.html#op-op-op-op-settings-op-op-dir-op-lt-op-directory-op-gt-op). | `` (An empty value forces the use of the default path.) | Yes. |
| `qbs.buildDirectory`| Specify location of the QBS [build directory](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-build-op-op-directory-op-op-op-op-d-op-lt-op-directory-op-gt-op). | `${sourceDirectory}/build/${profileName}_${configurationName}` | Yes. |
| `qbs.commandEchoMode`| Specifies how Qbs should display the command lines at building using the [command echo mode](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-command-op-op-echo-op-op-mode-op-lt-op-mode-op-gt-op). | `summary` | No. |
| `qbs.maxBuildJobs`| Specify the number of CPU cores to build. | `0` (Causes QBS to use all CPU cores.) | No. |
| `qbs.keepGoing`| Keeps [going](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-keep-op-op-going-op-op-op-op-k) when errors occur, if at all possible. | `false` | No. |
| `qbs.forceProbes`| Forces [re-execution](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-force-op-op-probe-op-op-execution) of all Probe items' configure scripts, rather than using the cached data. | `false` | No. |
| `qbs.cleanInstallRoot`| Removes the [installation](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-clean-op-op-install-op-op-root) base directory before installing. | `false` | No. |
| `qbs.errorHandlingMode`| Specifies how Qbs should deal with issues in project files, such as assigning to an unknown property. | `relaxed` | No. |
| `qbs.logLevel`| Uses the specified [log level](https://doc.qt.io/qbs/cli-build.html#op-op-op-op-log-op-op-level-op-lt-op-level-op-gt-op). | `info` | No. |
| `qbs.launchFilePath`| Specify location to the debugger configuration in the `launch.json` file. | `${sourceDirectory}/.vscode/launch.json` | Yes. |
| `qbs.showDisabledProjectItems`| Shows the disabled project items (sub-projects, products, groups). | `false` | No. |
| `qbs.configurationsFilePath`| Specify location to the build configurations `qbs-configurations.json` file. | `${sourceDirectory}/.vscode/qbs-configurations.json` | Yes. |
| `qbs.clearOutputBeforeOperation`| Clears the output console before starting the operation (applicable for Resolve, Clean, Build, and ReBuild operations). | `false` | No. |

## Variable substitution

Some options support the replacement of special values in their string value
by using a `${variable}` syntax. The following built-in variables are expanded:

| Variable | Expansion |
|---------|---------|
| `${sourceDirectory}` | The full path to the workspace root directory. |
| `${profileName}` | The current QBS build name. For example: `MSVC2019-x86`, `clang-cl-x86`. |
| `${configurationName}`| The current QBS build configuration name. For example: `debug`, `release`. |
| `${projectName}` | The project name. |

## Next steps

- Explore the [QBS documentation](README.md)
