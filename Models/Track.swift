import Foundation

struct Track: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    var artist: String
    var title: String
    var album: String?
    var isrc: String?
    var durationSeconds: Double?

    init(
        id: UUID = UUID(),
        artist: String,
        title: String,
        album: String? = nil,
        isrc: String? = nil,
        durationSeconds: Double? = nil
    ) {
        self.id = id
        self.artist = artist
        self.title = title
        self.album = album
        self.isrc = isrc
        self.durationSeconds = durationSeconds
    }

    var displayName: String {
        "\(artist) - \(title)"
    }

    var normalizedLookupKey: String {
        let normalizedArtist = artist.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return "\(normalizedArtist)|\(normalizedTitle)"
    }
}
