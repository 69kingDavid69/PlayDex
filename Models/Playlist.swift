import Foundation

enum PlaylistSource: String, Codable, Hashable, Sendable {
    case xmlLibrary = "XML Library"
    case csvLibrary = "CSV Library"
    case musicKit   = "MusicKit"
}

struct Playlist: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    var name: String
    var tracks: [Track]
    var source: PlaylistSource

    init(
        id: UUID = UUID(),
        name: String,
        tracks: [Track],
        source: PlaylistSource = .xmlLibrary
    ) {
        self.id = id
        self.name = name
        self.tracks = tracks
        self.source = source
    }

    var trackCount: Int {
        tracks.count
    }
}
