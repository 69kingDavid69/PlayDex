import Foundation

enum CSVLibraryParserError: Error, LocalizedError {
    case fileNotFound(String)
    case emptyFile
    case missingRequiredColumns

    var errorDescription: String? {
        switch self {
        case .fileNotFound(let path):
            return "El archivo CSV no se encontró en \(path)."
        case .emptyFile:
            return "El archivo CSV está vacío o no contiene filas de datos."
        case .missingRequiredColumns:
            return "El CSV debe tener columnas identificables de título y artista."
        }
    }
}

struct CSVLibraryParser {

    // MARK: - Public

    /// Parses a CSV file at `url` and returns a single `Playlist`.
    /// The playlist name is derived from the filename (without extension).
    func loadPlaylist(from url: URL) throws -> Playlist {
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw CSVLibraryParserError.fileNotFound(url.path)
        }

        let raw = try String(contentsOf: url, encoding: .utf8)
        let lines = splitLines(raw)

        guard let headerLine = lines.first else {
            throw CSVLibraryParserError.emptyFile
        }

        // Strip quotes from headers and normalize to lowercase
        let headers = parseRow(headerLine).map { unquote($0).lowercased().trimmingCharacters(in: .whitespaces) }

        // Use contains-based matching to handle variants like "Track Name", "Song Title", etc.
        guard
            let titleIndex  = firstIndex(in: headers, containing: ["title", "name", "song", "track"]),
            let artistIndex = firstIndex(in: headers, containing: ["artist"])
        else {
            throw CSVLibraryParserError.missingRequiredColumns
        }

        let albumIndex    = firstIndex(in: headers, containing: ["album"])
        let isrcIndex     = firstIndex(in: headers, containing: ["isrc"])
        let durationIndex = firstIndex(in: headers, containing: ["duration"])

        let dataLines = lines.dropFirst()

        let tracks: [Track] = dataLines.compactMap { line in
            let cols = parseRow(line).map { unquote($0).trimmingCharacters(in: .whitespaces) }
            guard cols.count > max(titleIndex, artistIndex) else { return nil }

            let title = cols[titleIndex]
            // For multi-artist fields like "Artist A, Artist B", take only the first
            let artist = firstArtist(cols[artistIndex])

            guard !title.isEmpty, !artist.isEmpty else { return nil }

            let album = albumIndex.flatMap { $0 < cols.count ? nilIfEmpty(cols[$0]) : nil }
            let isrc  = isrcIndex.flatMap  { $0 < cols.count ? nilIfEmpty(cols[$0]) : nil }
            let duration = durationIndex.flatMap { idx -> Double? in
                guard idx < cols.count else { return nil }
                guard let ms = Double(cols[idx]), ms > 0 else { return nil }
                // Spotify exports duration in ms; values > 3600 are ms, smaller are already seconds
                return ms > 3600 ? ms / 1000 : ms
            }

            return Track(
                artist: artist,
                title: title,
                album: album,
                isrc: isrc,
                durationSeconds: duration
            )
        }

        let playlistName = url.deletingPathExtension().lastPathComponent
        return Playlist(name: playlistName, tracks: tracks, source: .csvLibrary)
    }

    // MARK: - Private helpers

    /// Splits raw CSV text into non-empty lines.
    private func splitLines(_ text: String) -> [String] {
        text.components(separatedBy: .newlines)
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    /// Parses a single CSV row, respecting quoted fields (which may contain commas).
    private func parseRow(_ line: String) -> [String] {
        var fields: [String] = []
        var current = ""
        var inQuotes = false

        for char in line {
            if char == "\"" {
                inQuotes.toggle()
            } else if char == "," && !inQuotes {
                fields.append(current)
                current = ""
            } else {
                current.append(char)
            }
        }
        fields.append(current)
        return fields
    }

    /// Removes surrounding double-quotes from a field value.
    private func unquote(_ value: String) -> String {
        var s = value
        if s.hasPrefix("\"") { s.removeFirst() }
        if s.hasSuffix("\"") { s.removeLast() }
        return s
    }

    /// Returns the first non-empty value, or nil.
    private func nilIfEmpty(_ value: String) -> String? {
        value.isEmpty ? nil : value
    }

    /// For multi-artist strings like "Artist A, Artist B", returns only the first.
    private func firstArtist(_ value: String) -> String {
        // Only split on comma if the field looks like a list of artists
        // (i.e., the full value is not a single artist with a comma in their name).
        // Heuristic: Spotify multi-artist fields contain short tokens separated by ", ".
        let parts = value.components(separatedBy: ", ")
        return parts.first?.trimmingCharacters(in: .whitespaces) ?? value
    }

    /// Returns the first index in `headers` where the header *contains* any candidate keyword,
    /// but skips columns that are clearly metadata (uri, url, id, image).
    private func firstIndex(in headers: [String], containing candidates: [String]) -> Int? {
        let metadataKeywords = ["uri", "url", "id", "image"]

        for (idx, header) in headers.enumerated() {
            // Skip columns that are metadata, not human-readable names
            let isMetadata = metadataKeywords.contains { header.contains($0) }
            if isMetadata { continue }

            for candidate in candidates {
                if header.contains(candidate) {
                    return idx
                }
            }
        }
        return nil
    }
}
