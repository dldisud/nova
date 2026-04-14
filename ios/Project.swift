import ProjectDescription

let project = Project(
    name: "InkRoad",
    organizationName: "InkRoad",
    options: .options(
        defaultKnownRegions: ["ko", "en"],
        developmentRegion: "ko"
    ),
    settings: .settings(
        base: [
            "PRODUCT_NAME": "InkRoad",
            "SWIFT_VERSION": "5.9",
            "MARKETING_VERSION": "1.0.0",
            "CURRENT_PROJECT_VERSION": "1",
            "DEVELOPMENT_TEAM": "",
            "CODE_SIGN_STYLE": "Automatic"
        ]
    ),
    targets: [
        .target(
            name: "InkRoad",
            destinations: .iOS,
            product: .app,
            bundleId: "com.inkroad.app",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .extendingDefault(
                with: [
                    "CFBundleDisplayName": "InkRoad",
                    "UILaunchScreen": [:],
                    "NSAppTransportSecurity": [
                        "NSAllowsArbitraryLoads": true
                    ],
                    "UISupportedInterfaceOrientations": [
                        "UIInterfaceOrientationPortrait",
                        "UIInterfaceOrientationLandscapeLeft",
                        "UIInterfaceOrientationLandscapeRight"
                    ],
                    "UISupportedInterfaceOrientations~ipad": [
                        "UIInterfaceOrientationPortrait",
                        "UIInterfaceOrientationPortraitUpsideDown",
                        "UIInterfaceOrientationLandscapeLeft",
                        "UIInterfaceOrientationLandscapeRight"
                    ]
                ]
            ),
            sources: ["InkRoadApp/Sources/**"],
            resources: ["InkRoadApp/Resources/**"]
        )
    ]
)
