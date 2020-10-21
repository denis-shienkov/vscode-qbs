# QBS profiles

A _profile_ defines project-agnostic and configuration-agnostic info
about how to build code.

Each profile includes:

- A unique name.
- A toolchain configuration.

QBS has the functionality both for manually creating the necessary
profiles, and the functionality for automatically detecting the
toolchains installed in the system.

More detailed information about the profiles can be obtained from
the official [documentation](https://doc.qt.io/qbs/configuring.html)
for QBS.


## Automatic profiles creation

It is possible to automatically detect all profiles installed
in the system.

The paths to some compilers (such as `GCC`) must be placed in the `PATH`
environment variable. But other compilers (such as `MSVC`, `IAR EW`,
`KEIL`) will be detected automatically from the Windows registry.

To do this, run the following command:

```bash
$ qbs setup-toolchains --detect
```

In this case, QBS will automatically detect the toolchainn architecture,
the toolchain version, the compiler paths, and on this basis will
automatically generate the profiles with unique names.

A list of created profiles can be obtained by running the following
command:

```bash
$ qbs config --list profiles
```

## Manual profiles creation

It is possible to create the custom profiles by manually setting
the path to the compiler. In this case, the user can specify
any desired profile name.

For example, to do this, run the following [command]
(https://doc.qt.io/qbs/cli-setup-toolchains.html):

```bash
$ qbs setup-toolchains C:\mingw530_32\bin\g++.exe mingw
```

Also, it is possible to create the profile that allows to build the Qt
projects, using the [setup-qt](https://doc.qt.io/qbs/cli-setup-qt.html)
command.

## Next steps

- Explore the [QBS documentation](README.md)
