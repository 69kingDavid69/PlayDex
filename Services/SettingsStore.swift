import Combine
import Foundation

@MainActor
final class SettingsStore: ObservableObject {
    @Published var downloadLocation: String {
        didSet { persist() }
    }

    @Published var preferredFormat: AudioFormat {
        didSet { persist() }
    }

    @Published var allowFallback: Bool {
        didSet { persist() }
    }

    @Published var rejectBelow320: Bool {
        didSet { persist() }
    }

    @Published var parallelDownloads: Int {
        didSet { persist() }
    }

    @Published var retryCount: Int {
        didSet { persist() }
    }

    @Published var arlToken: String {
        didSet { persistARL() }
    }

    @Published var customLibraryXMLPath: String? {
        didSet { persistLibraryXMLPath() }
    }

    @Published private(set) var recentLibraryXMLPaths: [String] {
        didSet { persistRecentLibraryXMLPaths() }
    }

    @Published var lastPersistError: String?

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.downloadLocation = defaults.string(forKey: Keys.downloadLocation) ?? "~/Music/PlayDex"

        if let storedFormat = defaults.string(forKey: Keys.preferredFormat),
           let format = AudioFormat(rawValue: storedFormat) {
            self.preferredFormat = format
        } else {
            self.preferredFormat = .flac
        }

        self.allowFallback = defaults.object(forKey: Keys.allowFallback) as? Bool ?? true
        self.rejectBelow320 = defaults.object(forKey: Keys.rejectBelow320) as? Bool ?? true
        self.parallelDownloads = defaults.object(forKey: Keys.parallelDownloads) as? Int ?? 3
        self.retryCount = defaults.object(forKey: Keys.retryCount) as? Int ?? 2
        self.arlToken = (try? KeychainStore.read(account: Keys.arlAccount)) ?? ""
        self.customLibraryXMLPath = defaults.string(forKey: Keys.customLibraryXMLPath)
        self.recentLibraryXMLPaths = defaults.stringArray(forKey: Keys.recentLibraryXMLPaths) ?? []
        self.persistEngineConfig()
    }

    var expandedDownloadLocation: URL {
        URL(fileURLWithPath: (downloadLocation as NSString).expandingTildeInPath)
    }

    var engineConfigDirectory: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".deemix-itunes", isDirectory: true)
    }

    var engineConfigURL: URL {
        engineConfigDirectory.appendingPathComponent("config.json")
    }

    var customLibraryXMLURL: URL? {
        guard let customLibraryXMLPath, !customLibraryXMLPath.isEmpty else {
            return nil
        }

        return URL(fileURLWithPath: (customLibraryXMLPath as NSString).expandingTildeInPath)
    }

    var recentLibraryXMLURLs: [URL] {
        recentLibraryXMLPaths.map { URL(fileURLWithPath: ($0 as NSString).expandingTildeInPath) }
    }

    func setCustomLibraryXMLURL(_ url: URL?) {
        customLibraryXMLPath = url?.path

        if let url {
            addRecentLibraryXMLURL(url)
        }
    }

    func setDownloadLocation(_ url: URL) {
        downloadLocation = url.path
    }

    func removeRecentLibraryXMLURL(_ url: URL) {
        recentLibraryXMLPaths.removeAll { $0 == url.path }
    }

    func persistEngineConfig() {
        do {
            try FileManager.default.createDirectory(
                at: engineConfigDirectory,
                withIntermediateDirectories: true,
                attributes: nil
            )

            let config = EngineConfig(
                downloadLocation: downloadLocation,
                quality: .init(
                    preferred: preferredFormat.rawValue,
                    fallbackChain: fallbackChain(),
                    rejectBelow: rejectBelow320 ? AudioFormat.mp3_320.rawValue : nil
                ),
                parallelDownloads: parallelDownloads,
                retryCount: retryCount
            )

            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(config)
            try data.write(to: engineConfigURL, options: .atomic)
            lastPersistError = nil
        } catch {
            lastPersistError = error.localizedDescription
        }
    }

    private func persist() {
        defaults.set(downloadLocation, forKey: Keys.downloadLocation)
        defaults.set(preferredFormat.rawValue, forKey: Keys.preferredFormat)
        defaults.set(allowFallback, forKey: Keys.allowFallback)
        defaults.set(rejectBelow320, forKey: Keys.rejectBelow320)
        defaults.set(parallelDownloads, forKey: Keys.parallelDownloads)
        defaults.set(retryCount, forKey: Keys.retryCount)
        persistEngineConfig()
    }

    private func persistARL() {
        do {
            try KeychainStore.save(arlToken, account: Keys.arlAccount)
            lastPersistError = nil
        } catch {
            lastPersistError = error.localizedDescription
        }
    }

    private func persistLibraryXMLPath() {
        if let customLibraryXMLPath, !customLibraryXMLPath.isEmpty {
            defaults.set(customLibraryXMLPath, forKey: Keys.customLibraryXMLPath)
        } else {
            defaults.removeObject(forKey: Keys.customLibraryXMLPath)
        }
    }

    private func persistRecentLibraryXMLPaths() {
        defaults.set(recentLibraryXMLPaths, forKey: Keys.recentLibraryXMLPaths)
    }

    private func addRecentLibraryXMLURL(_ url: URL) {
        recentLibraryXMLPaths.removeAll { $0 == url.path }
        recentLibraryXMLPaths.insert(url.path, at: 0)
        recentLibraryXMLPaths = Array(recentLibraryXMLPaths.prefix(5))
    }

    private func fallbackChain() -> [String] {
        switch preferredFormat {
        case .flac:
            return allowFallback ? [AudioFormat.flac.rawValue, AudioFormat.mp3_320.rawValue] : [AudioFormat.flac.rawValue]
        case .mp3_320:
            return [AudioFormat.mp3_320.rawValue]
        }
    }

    private enum Keys {
        static let downloadLocation = "downloadLocation"
        static let preferredFormat = "preferredFormat"
        static let allowFallback = "allowFallback"
        static let rejectBelow320 = "rejectBelow320"
        static let parallelDownloads = "parallelDownloads"
        static let retryCount = "retryCount"
        static let arlAccount = "deezer-arl"
        static let customLibraryXMLPath = "customLibraryXMLPath"
        static let recentLibraryXMLPaths = "recentLibraryXMLPaths"
    }
}

private struct EngineConfig: Encodable {
    struct Quality: Encodable {
        let preferred: String
        let fallbackChain: [String]
        let rejectBelow: String?

        enum CodingKeys: String, CodingKey {
            case preferred
            case fallbackChain = "fallback_chain"
            case rejectBelow = "reject_below"
        }
    }

    let downloadLocation: String
    let quality: Quality
    let parallelDownloads: Int
    let retryCount: Int
}
