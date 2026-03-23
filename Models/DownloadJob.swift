import Foundation

enum AudioFormat: String, Codable, CaseIterable, Hashable, Identifiable, Sendable {
    case flac = "FLAC"
    case mp3_320 = "MP3_320"

    var id: String { rawValue }

    var badgeTitle: String {
        switch self {
        case .flac:
            return "HiFi"
        case .mp3_320:
            return "320"
        }
    }

    var fileExtension: String {
        switch self {
        case .flac:
            return "flac"
        case .mp3_320:
            return "mp3"
        }
    }

    var humanDescription: String {
        switch self {
        case .flac:
            return "FLAC lossless"
        case .mp3_320:
            return "MP3 320 kbps"
        }
    }
}

enum DownloadState: String, Codable, Hashable, Sendable {
    case pending
    case downloading
    case completed
    case skipped
    case error
    case paused
}

struct DownloadJob: Identifiable, Hashable, Sendable {
    let id: UUID
    let playlistName: String
    let track: Track
    var status: DownloadState
    var audioFormat: AudioFormat?
    var progressPercent: Double
    var speedKbps: Double?
    var etaSeconds: Int?
    var filePath: String?
    var fileSizeMB: Double?
    var message: String?
    var existingPlaylist: String?

    init(
        id: UUID = UUID(),
        playlistName: String,
        track: Track,
        status: DownloadState = .pending,
        audioFormat: AudioFormat? = nil,
        progressPercent: Double = 0,
        speedKbps: Double? = nil,
        etaSeconds: Int? = nil,
        filePath: String? = nil,
        fileSizeMB: Double? = nil,
        message: String? = nil,
        existingPlaylist: String? = nil
    ) {
        self.id = id
        self.playlistName = playlistName
        self.track = track
        self.status = status
        self.audioFormat = audioFormat
        self.progressPercent = progressPercent
        self.speedKbps = speedKbps
        self.etaSeconds = etaSeconds
        self.filePath = filePath
        self.fileSizeMB = fileSizeMB
        self.message = message
        self.existingPlaylist = existingPlaylist
    }

    var statusLabel: String {
        switch status {
        case .pending:
            return "En cola"
        case .downloading:
            return "Descargando \(Int(progressPercent))%"
        case .completed:
            return audioFormat?.humanDescription ?? "Completada"
        case .skipped:
            if let existingPlaylist {
                return "Ya descargada en \(existingPlaylist)"
            }
            return "Omitida"
        case .error:
            return message ?? "Error"
        case .paused:
            return "Pausada"
        }
    }
}
