import PackageDescription

let package = Package(
    name: "InkRoadApp",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "InkRoadApp",
            targets: ["InkRoadApp"]),
    ],
    targets: [
        .target(
            name: "InkRoadApp",
            path: "ios/InkRoadApp/Sources"),
    ]
)
