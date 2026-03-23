// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PlayDex",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "PlayDex",
            targets: ["PlayDex"]
        )
    ],
    targets: [
        .executableTarget(
            name: "PlayDex",
            path: ".",
            sources: [
                "App",
                "Models",
                "Services",
                "Views"
            ],
            resources: [
                .copy("Resources/python")
            ]
        )
    ]
)
