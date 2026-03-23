import Foundation

private final class PythonBridgeBundleToken {}

enum PythonBridgeError: Error, LocalizedError {
    case scriptNotFound
    case stdinUnavailable
    case processLaunchFailed(String)

    var errorDescription: String? {
        switch self {
        case .scriptNotFound:
            return "No se encontro `deemix_engine.py` dentro de los recursos."
        case .stdinUnavailable:
            return "El bridge Python no expuso un canal stdin escribible."
        case .processLaunchFailed(let message):
            return "No se pudo lanzar el proceso Python: \(message)"
        }
    }
}

struct EngineTrackDescriptor: Decodable, Hashable, Sendable {
    let artist: String
    let title: String
}

struct PlaylistStats: Decodable, Hashable, Sendable {
    let completed: Int
    let skipped: Int
    let errors: Int
}

struct EngineEvent: Decodable, Sendable {
    enum EventType: String, Decodable, Sendable {
        case progress
        case completed
        case skipped
        case error
        case playlistDone = "playlist_done"
        case bridgeReady = "bridge_ready"
        case bridgeError = "bridge_error"
    }

    let event: EventType
    let track: EngineTrackDescriptor?
    let percent: Double?
    let speedKbps: Double?
    let etaSeconds: Int?
    let filePath: String?
    let audioFormat: String?
    let fileSizeMB: Double?
    let reason: String?
    let existingFile: String?
    let existingPlaylist: String?
    let errorCode: String?
    let message: String?
    let playlist: String?
    let stats: PlaylistStats?
    let deemixAvailable: Bool?
    let downloadReady: Bool?
    let arlPresent: Bool?

    enum CodingKeys: String, CodingKey {
        case event
        case track
        case percent
        case speedKbps = "speed_kbps"
        case etaSeconds = "eta_seconds"
        case filePath = "file_path"
        case audioFormat = "audio_format"
        case fileSizeMB = "file_size_mb"
        case reason
        case existingFile = "existing_file"
        case existingPlaylist = "existing_playlist"
        case errorCode = "error_code"
        case message
        case playlist
        case stats
        case deemixAvailable = "deemix_available"
        case downloadReady = "download_ready"
        case arlPresent = "arl_present"
    }
}

@MainActor
final class PythonBridge {
    var onEvent: ((EngineEvent) -> Void)?

    private let settings: SettingsStore
    private var process: Process?
    private var stdinHandle: FileHandle?
    private var stdoutBuffer = ""
    private var receivedBridgeError = false
    private var intentionalTermination = false

    init(settings: SettingsStore) {
        self.settings = settings
    }

    func startIfNeeded() throws {
        guard process == nil else {
            return
        }

        guard let scriptURL = scriptURL() else {
            throw PythonBridgeError.scriptNotFound
        }

        let process = Process()
        let stdinPipe = Pipe()
        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        receivedBridgeError = false
        stdoutBuffer.removeAll(keepingCapacity: true)

        if let bundledInterpreterURL = bundledInterpreterURL() {
            process.executableURL = bundledInterpreterURL
            process.arguments = [scriptURL.path]
        } else {
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = ["python3", scriptURL.path]
        }

        var environment = ProcessInfo.processInfo.environment
        environment["PYTHONUNBUFFERED"] = "1"
        environment["DEEMIX_ITUNES_CONFIG_PATH"] = settings.engineConfigURL.path
        environment["DEEMIX_ITUNES_ARL"] = settings.arlToken
        if let vendorURL = vendorURL() {
            let existingPythonPath = environment["PYTHONPATH"]
            environment["PYTHONPATH"] = [vendorURL.path, existingPythonPath]
                .compactMap { $0 }
                .joined(separator: ":")
        }
        process.environment = environment
        process.standardInput = stdinPipe
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        stdoutPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            Task { @MainActor in
                self?.consumeStdout(data: data)
            }
        }

        stderrPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            let output = String(decoding: data, as: UTF8.self)
            fputs(output, stderr)
        }

        process.terminationHandler = { [weak self] process in
            Task { @MainActor in
                self?.process = nil
                self?.stdinHandle = nil
                guard self?.intentionalTermination != true,
                      process.terminationStatus != 0,
                      self?.receivedBridgeError != true else {
                    return
                }

                self?.onEvent?(EngineEvent(
                    event: .bridgeError,
                    track: nil,
                    percent: nil,
                    speedKbps: nil,
                    etaSeconds: nil,
                    filePath: nil,
                    audioFormat: nil,
                    fileSizeMB: nil,
                    reason: nil,
                    existingFile: nil,
                    existingPlaylist: nil,
                    errorCode: "PROCESS_EXITED",
                    message: "El bridge Python finalizo con codigo \(process.terminationStatus).",
                    playlist: nil,
                    stats: nil,
                    deemixAvailable: nil,
                    downloadReady: nil,
                    arlPresent: nil
                ))
            }
        }

        do {
            try process.run()
        } catch {
            throw PythonBridgeError.processLaunchFailed(error.localizedDescription)
        }

        self.process = process
        self.stdinHandle = stdinPipe.fileHandleForWriting
    }

    func download(playlist: Playlist) throws {
        try send(DownloadPlaylistCommand(playlist: playlist))
    }

    func restart() throws {
        stop()
        try startIfNeeded()
    }

    func pause() throws {
        try send(ControlCommand(command: "pause"))
    }

    func resume() throws {
        try send(ControlCommand(command: "resume"))
    }

    func cancel() throws {
        try send(ControlCommand(command: "cancel"))
    }

    func stop() {
        guard let process else {
            stdinHandle = nil
            stdoutBuffer.removeAll(keepingCapacity: false)
            return
        }

        intentionalTermination = true

        if let stdoutPipe = process.standardOutput as? Pipe {
            stdoutPipe.fileHandleForReading.readabilityHandler = nil
        }
        if let stderrPipe = process.standardError as? Pipe {
            stderrPipe.fileHandleForReading.readabilityHandler = nil
        }

        process.terminationHandler = nil

        if process.isRunning {
            process.terminate()
            process.waitUntilExit()
        }

        self.process = nil
        self.stdinHandle = nil
        self.stdoutBuffer.removeAll(keepingCapacity: false)
        self.receivedBridgeError = false
        self.intentionalTermination = false
    }

    private func send(_ payload: some Encodable) throws {
        guard let stdinHandle else {
            throw PythonBridgeError.stdinUnavailable
        }

        let encoder = JSONEncoder()
        let data = try encoder.encode(payload)
        stdinHandle.write(data)
        stdinHandle.write(Data([0x0A]))
    }

    private func consumeStdout(data: Data) {
        stdoutBuffer.append(String(decoding: data, as: UTF8.self))

        while let newlineRange = stdoutBuffer.range(of: "\n") {
            let line = String(stdoutBuffer[..<newlineRange.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
            stdoutBuffer.removeSubrange(..<newlineRange.upperBound)

            guard !line.isEmpty else {
                continue
            }

            let decoder = JSONDecoder()
            guard let rawData = line.data(using: .utf8) else {
                continue
            }

            do {
                let event = try decoder.decode(EngineEvent.self, from: rawData)
                if event.event == .bridgeError {
                    receivedBridgeError = true
                }
                onEvent?(event)
            } catch {
                fputs("No se pudo decodificar evento del bridge: \(line)\n", stderr)
            }
        }
    }

    private func scriptURL() -> URL? {
        resourceCandidates()
            .map { $0.appendingPathComponent("deemix_engine.py") }
            .first(where: { FileManager.default.fileExists(atPath: $0.path) })
    }

    private func bundledInterpreterURL() -> URL? {
        resourceCandidates()
            .map { $0.appendingPathComponent("python3.11") }
            .first(where: { FileManager.default.fileExists(atPath: $0.path) })
    }

    private func vendorURL() -> URL? {
        resourceCandidates()
            .map { $0.appendingPathComponent("vendor", isDirectory: true) }
            .first(where: { FileManager.default.fileExists(atPath: $0.path) })
    }

    private func resourceCandidates() -> [URL] {
        let bundleCandidates = [
            Bundle.main.resourceURL,
            Bundle(for: PythonBridgeBundleToken.self).resourceURL,
            Bundle.main.bundleURL
        ]
        .compactMap { $0 }

        let filesystemCandidates = [
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                .appendingPathComponent("Resources/python", isDirectory: true),
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                .appendingPathComponent(".build/arm64-apple-macosx/debug/PlayDex_PlayDex.resources/python", isDirectory: true),
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                .appendingPathComponent(".build/arm64-apple-macosx/debug/DeemixiTunes_DeemixiTunes.resources/python", isDirectory: true)
        ]

        return (bundleCandidates.flatMap { candidate in
            [
                candidate.appendingPathComponent("python", isDirectory: true),
                candidate.appendingPathComponent("Resources/python", isDirectory: true)
            ]
        } + filesystemCandidates)
    }
}

private struct ControlCommand: Encodable {
    let command: String
}

private struct DownloadPlaylistCommand: Encodable {
    let command = "download_playlist"
    let playlist: Playlist
}
