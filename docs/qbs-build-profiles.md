# Build profiles

A _profile_ defines project-agnostic and configuration-agnostic
info about how to build code.

Each build profile includes:

- An unique name.
- A toolchain configuration.

Qbs has the functionality both for manually creating the
necessary build profiles, and the functionality for
automatically detecting the toolchains installed in the
system.

More detailed information about the profiles can be
obtained from the official
[documentation](https://doc.qt.io/qbs/configuring.html)
for Qbs.


## Automatic build profiles creation

It is possible to automatically detect all toolchains
installed in the system and to generate the build profiles.

The paths to some toolchains (such as `GCC`) must be
placed in the `PATH` environment variable. But the other
toolchains (such as `MSVC`, `IAR EW`, `KEIL`) will be
detected automatically from the Windows registry.

To do this, run the
[setup-toolchains](https://doc.qt.io/qbs/cli-setup-toolchains.html)
command:

```bash
$ qbs setup-toolchains --detect
```

* Also from the command palette in VS Code, run the
**Qbs: Scan Build Profiles** command.

In this case, Qbs will automatically detect the toolchain
architecture and version, the compiler path, and on this
basis will automatically generate the profiles with the
unique names.

A list of created profiles can be obtained by running the
[setup-toolchains](https://doc.qt.io/qbs/cli-setup-toolchains.html)
command:

```bash
$ qbs config --list profiles
```

* Also from the command palette in VS Code, run the
**Qbs: Select Build Profile** command.

## Manual build profiles creation

It is possible to create the custom profiles by manually
setting the path to the compiler. In this case, the user
can set any desired build profile name.

For example, to do this, run the
[setup-toolchains](https://doc.qt.io/qbs/cli-setup-toolchains.html)
command:

```bash
$ qbs setup-toolchains C:\mingw530_32\bin\g++.exe mingw
```

Also, it is possible to create the profile that allows to build the Qt
projects, using the [setup-qt](https://doc.qt.io/qbs/cli-setup-qt.html)
command.

## Exporting build profiles

* To export the build profiles into a text file, run the
**Qbs: Export Build Profiles** command from the command palette
in VS Code.

This command is an equivalent for the Qbs
[export-profiles](https://doc.qt.io/qbs/cli-config.html#op-op-op-op-keyword-export-keyword-op-lt-op-file-op-gt-op)
command:

```bash
$ qbs config --export <path/to/output/file> --settings-dir <path/to/settings/directory>
```

**Note**: Exported profiles are taken from the Qbs settings directory.

## Next steps

- Explore the [Qbs documentation](README.md)
