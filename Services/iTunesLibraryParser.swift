import Foundation

enum ITunesLibraryParserError: Error, LocalizedError {
    case libraryNotFound
    case customLibraryNotFound(String)
    case musicLibraryPackageFound(String)
    case malformedLibrary

    var errorDescription: String? {
        switch self {
        case .libraryNotFound:
            return "No se encontro un archivo XML legible de Music/iTunes."
        case .customLibraryNotFound(let path):
            return "El XML seleccionado ya no existe en \(path)."
        case .musicLibraryPackageFound(let path):
            return "Se detecto una libreria moderna de Music en \(path), pero esta version de la app necesita un XML exportado. En Music usa File > Library > Export Library y luego pulsa \"Importar XML...\"."
        case .malformedLibrary:
            return "El archivo de libreria existe, pero no tiene el formato esperado."
        }
    }
}

struct ITunesLibraryParser {
    func loadPlaylists(customLibraryURL: URL? = nil) async throws -> [Playlist] {
        try parseXMLLibrary(customLibraryURL: customLibraryURL)
    }

    private func parseXMLLibrary(customLibraryURL: URL?) throws -> [Playlist] {
        let candidateURLs = candidateLibraryURLs(customLibraryURL: customLibraryURL)

        if let customLibraryURL, FileManager.default.fileExists(atPath: customLibraryURL.path) == false {
            throw ITunesLibraryParserError.customLibraryNotFound(customLibraryURL.path)
        }

        guard let url = candidateURLs.first(where: { FileManager.default.fileExists(atPath: $0.path) }) else {
            if let musicLibraryPackageURL {
                throw ITunesLibraryParserError.musicLibraryPackageFound(musicLibraryPackageURL.path)
            }

            throw ITunesLibraryParserError.libraryNotFound
        }

        let data = try Data(contentsOf: url)
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil)

        guard
            let root = plist as? [String: Any],
            let tracksDictionary = root["Tracks"] as? [String: [String: Any]],
            let playlistsArray = root["Playlists"] as? [[String: Any]]
        else {
            throw ITunesLibraryParserError.malformedLibrary
        }

        let playlists = playlistsArray.compactMap { playlistDictionary -> Playlist? in
            if playlistDictionary["Master"] as? Bool == true {
                return nil
            }

            guard let name = playlistDictionary["Name"] as? String else {
                return nil
            }

            let items = playlistDictionary["Playlist Items"] as? [[String: Any]] ?? []
            let tracks = items.compactMap { item -> Track? in
                guard let rawTrackID = item["Track ID"] else {
                    return nil
                }

                let trackID: String
                if let intValue = rawTrackID as? Int {
                    trackID = String(intValue)
                } else if let stringValue = rawTrackID as? String {
                    trackID = stringValue
                } else {
                    return nil
                }

                guard let rawTrack = tracksDictionary[trackID] else {
                    return nil
                }

                let artist = (rawTrack["Artist"] as? String)
                    ?? (rawTrack["Album Artist"] as? String)
                    ?? "Unknown Artist"
                let title = (rawTrack["Name"] as? String) ?? "Unknown Title"
                let album = rawTrack["Album"] as? String
                let isrc = rawTrack["ISRC"] as? String
                let durationMilliseconds = rawTrack["Total Time"] as? Double ?? Double(rawTrack["Total Time"] as? Int ?? 0)
                let durationSeconds = durationMilliseconds > 0 ? durationMilliseconds / 1000 : nil

                return Track(
                    artist: artist,
                    title: title,
                    album: album,
                    isrc: isrc,
                    durationSeconds: durationSeconds
                )
            }

            guard !tracks.isEmpty else {
                return nil
            }

            return Playlist(
                name: name,
                tracks: tracks,
                source: .xmlLibrary
            )
        }

        return playlists.sorted { lhs, rhs in
            lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
        }
    }

    private func candidateLibraryURLs(customLibraryURL: URL?) -> [URL] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        var urls = [URL]()

        if let customLibraryURL {
            urls.append(customLibraryURL)
        }

        urls.append(contentsOf: [
            home.appendingPathComponent("Music/Music/Music Library.xml"),
            home.appendingPathComponent("Music/iTunes/iTunes Library.xml")
        ])

        return urls
    }

    private var musicLibraryPackageURL: URL? {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let candidate = home.appendingPathComponent("Music/Music/Music Library.musiclibrary")
        return FileManager.default.fileExists(atPath: candidate.path) ? candidate : nil
    }
}
