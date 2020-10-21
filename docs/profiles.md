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
the official [documentation](https://doc.qt.io/qbs/configuring.html) for QBS.


## Automatic profiles detection

It is possible to automatically detect all profiles installed
in the system.

The paths to some compilers (such as GCC) must be placed in the `PATH`
environment variable. But other compilers (such as `MSVC`, `IAR EW`,
`KEIL`) will be detected automatically from the Windows registry.

To do this, run the following command:

```bash
$ qbs setup-toolchains --detect
```

A list of created profiles can be obtained by running the following
command:

```bash
$ qbs config --list profiles
```

## Next steps

- Explore the [QBS documentation](README.md)
