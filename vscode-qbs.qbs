import qbs

Product {
    files: [
        "CHANGELOG.md",
        "README.md",
        "package.json",
        "package.nls.json",
        "tsconfig.json",
    ]
    Group {
        name: "docs"
        prefix: "docs/"
        files: "**/*"
    }
    Group {
        name: "res"
        prefix: "res/"
        files: "**/*"
    }
    Group {
        name: "src"
        prefix: "src/"
        files: "**/*"
    }
    Group {
        name: "ci"
        prefix: ".github/"
        files: "**/*"
    }
}
