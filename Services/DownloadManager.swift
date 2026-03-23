import Combine
import Foundation
import AppKit
import UniformTypeIdentifiers
import UserNotifications

@MainActor
final class DownloadManager: ObservableObject {
    struct QueueSummary {
        let pending: Int
        let downloading: Int
        let completed: Int
        let skipped: Int
        let errors: Int
    }

    @Published private(set) var playlists: [Playlist] = []
    @Published var selectedPlaylistID: Playlist.ID?
    @Published private(set) var jobs: [DownloadJob] = []
    @Published private(set) var bridgeStatusText = "Preparando bridge…"
    @Published var lastErrorMessage: String?
    @Published private(set) var libraryStatusMessage: String?
    @Published private(set) var isPaused = false

    let settings: SettingsStore

    private let parser: ITunesLibraryParser
    private let csvParser: CSVLibraryParser
    private let bridge: PythonBridge
    private var hasBootstrapped = false
    private var bridgeHasDeemixModule = false
    private var bridgeHasARL = false
    private var bridgeCanDownload = false

    @Published private(set) var csvPlaylistURL: URL?

    init(settings: SettingsStore, parser: ITunesLibraryParser = .init(), csvParser: CSVLibraryParser = .init()) {
        self.settings = settings
        self.parser = parser
        self.csvParser = csvParser
        self.bridge = PythonBridge(settings: settings)
        self.bridge.onEvent = { [weak self] event in
            self?.handle(event)
        }
    }

    var selectedPlaylist: Playlist? {
        guard let selectedPlaylistID else {
            return nil
        }

        return playlists.first(where: { $0.id == selectedPlaylistID })
    }

    var hasQueuedJobs: Bool {
        !jobs.isEmpty
    }

    var isDownloading: Bool {
        jobs.contains(where: { $0.status == .downloading })
    }

    var menuBarStatusText: String {
        let summary = queueSummary

        if isPaused {
            return "Cola pausada"
        }

        if summary.downloading > 0 {
            return "Descargando \(summary.downloading) · \(summary.pending) pendientes"
        }

        if summary.completed + summary.skipped + summary.errors > 0 {
            return "\(summary.completed) completadas · \(summary.skipped) omitidas · \(summary.errors) errores"
        }

        return bridgeStatusText
    }

    var queueSummary: QueueSummary {
        QueueSummary(
            pending: jobs.filter { $0.status == .pending }.count,
            downloading: jobs.filter { $0.status == .downloading }.count,
            completed: jobs.filter { $0.status == .completed }.count,
            skipped: jobs.filter { $0.status == .skipped }.count,
            errors: jobs.filter { $0.status == .error }.count
        )
    }

    var importedLibraryXMLURL: URL? {
        settings.customLibraryXMLURL
    }

    var recentLibraryXMLURLs: [URL] {
        settings.recentLibraryXMLURLs.filter { FileManager.default.fileExists(atPath: $0.path) }
    }

    func bootstrapIfNeeded() async {
        guard !hasBootstrapped else {
            return
        }

        hasBootstrapped = true
        await reloadPlaylists()

        do {
            try bridge.startIfNeeded()
            bridgeStatusText = "Bridge listo"
        } catch {
            bridgeStatusText = "Bridge no disponible"
            lastErrorMessage = error.localizedDescription
        }
    }

    func reloadPlaylists() async {
        var merged: [Playlist] = []
        var errorMessage: String? = nil

        // Load XML playlists — failure here does NOT block CSV playlists
        do {
            let xmlPlaylists = try await parser.loadPlaylists(customLibraryURL: settings.customLibraryXMLURL)
            merged.append(contentsOf: xmlPlaylists)
        } catch {
            // Only surface the XML error if there's no CSV to fall back on
            errorMessage = error.localizedDescription
        }

        // Load CSV playlist — independent of XML
        if let csvURL = csvPlaylistURL {
            do {
                let csvPlaylist = try csvParser.loadPlaylist(from: csvURL)
                merged.append(csvPlaylist)
                errorMessage = nil  // CSV loaded fine, suppress XML error
            } catch {
                errorMessage = error.localizedDescription
            }
        }

        if merged.isEmpty {
            playlists = []
            selectedPlaylistID = nil
            libraryStatusMessage = errorMessage
        } else {
            self.playlists = merged.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            if selectedPlaylistID == nil {
                selectedPlaylistID = playlists.first?.id
            } else if let currentSelection = selectedPlaylistID,
                      playlists.contains(where: { $0.id == currentSelection }) == false {
                selectedPlaylistID = playlists.first?.id
            }
            libraryStatusMessage = nil
        }
    }

    func importLibraryXML() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.xml]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.prompt = "Importar"
        panel.message = "Selecciona un XML exportado desde Music o iTunes."
        panel.directoryURL = importedLibraryXMLURL?.deletingLastPathComponent()
            ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Music", isDirectory: true)

        if panel.runModal() == .OK, let url = panel.url {
            selectImportedLibraryXML(url)
        }
    }

    func importCSV() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.commaSeparatedText]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.prompt = "Importar"
        panel.message = "Selecciona un CSV exportado desde Spotify u otra app. El nombre del archivo será el nombre de la playlist."

        if panel.runModal() == .OK, let url = panel.url {
            csvPlaylistURL = url
            Task { await reloadPlaylists() }
        }
    }

    func clearImportedCSV() {
        csvPlaylistURL = nil
        Task { await reloadPlaylists() }
    }

    func selectImportedLibraryXML(_ url: URL) {
        settings.setCustomLibraryXMLURL(url)
        Task {
            await reloadPlaylists()
        }
    }

    func clearImportedLibraryXML() {
        settings.setCustomLibraryXMLURL(nil)
        Task {
            await reloadPlaylists()
        }
    }

    func revealImportedLibraryXML() {
        guard let importedLibraryXMLURL else {
            return
        }

        NSWorkspace.shared.activateFileViewerSelecting([importedLibraryXMLURL])
    }

    func queueSelectedPlaylist() {
        guard let playlist = selectedPlaylist else {
            return
        }

        let trimmedARL = settings.arlToken.trimmingCharacters(in: .whitespacesAndNewlines)

        if bridgeHasDeemixModule == false && trimmedARL.isEmpty {
            bridgeStatusText = "Bridge listo, configuración incompleta"
            lastErrorMessage = "Falta el token ARL de Deezer y este build aún no trae deemix embebido. Configura el ARL en Ajustes > Deezer e instala las dependencias Python del backend."
            return
        }

        guard bridgeHasDeemixModule else {
            bridgeStatusText = "Bridge listo, deemix no disponible"
            lastErrorMessage = "La integración de deemix no está disponible en este build. Instala las dependencias Python embebidas antes de descargar."
            return
        }

        guard !trimmedARL.isEmpty else {
            bridgeStatusText = "Bridge listo, falta ARL"
            lastErrorMessage = "Configura tu token ARL en Ajustes > Deezer antes de iniciar descargas."
            return
        }

        jobs.removeAll(where: { $0.playlistName == playlist.name })
        jobs.append(contentsOf: playlist.tracks.map {
            DownloadJob(playlistName: playlist.name, track: $0)
        })

        do {
            try bridge.restart()
            try bridge.download(playlist: playlist)
            isPaused = false
            bridgeStatusText = "Descargando \(playlist.name)"
        } catch {
            bridgeStatusText = "Error al iniciar la cola"
            lastErrorMessage = error.localizedDescription
            markPlaylist(named: playlist.name, as: .error, message: error.localizedDescription)
        }
    }

    func pauseAll() {
        do {
            try bridge.pause()
            isPaused = true
            bridgeStatusText = "Cola pausada"
            updateInFlightJobsForPause()
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    func resumeAll() {
        do {
            try bridge.resume()
            isPaused = false
            bridgeStatusText = "Cola reanudada"
            updatePausedJobsForResume()
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    func cancelAll() {
        do {
            try bridge.cancel()
            isPaused = false
            bridgeStatusText = "Cola cancelada"
            jobs.removeAll(where: { $0.status == .pending || $0.status == .downloading || $0.status == .paused })
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    func job(for track: Track, in playlistName: String) -> DownloadJob? {
        jobs.first(where: {
            $0.playlistName == playlistName && $0.track.normalizedLookupKey == track.normalizedLookupKey
        })
    }

    private func handle(_ event: EngineEvent) {
        switch event.event {
        case .bridgeReady:
            bridgeHasDeemixModule = event.deemixAvailable == true
            bridgeHasARL = event.arlPresent == true
            bridgeCanDownload = event.downloadReady == true

            if bridgeCanDownload {
                bridgeStatusText = "Bridge listo"
            } else if bridgeHasARL {
                bridgeStatusText = "Bridge listo, deemix no disponible"
            } else {
                bridgeStatusText = "Bridge listo, falta ARL"
            }

        case .bridgeError:
            bridgeStatusText = "Bridge con error"
            lastErrorMessage = event.message ?? "El proceso Python reporto un error."

        case .progress:
            updateJob(matching: event.track) { job in
                job.status = .downloading
                job.progressPercent = event.percent ?? job.progressPercent
                job.speedKbps = event.speedKbps
                job.etaSeconds = event.etaSeconds
            }

        case .completed:
            updateJob(matching: event.track) { job in
                job.status = .completed
                job.progressPercent = 100
                job.speedKbps = event.speedKbps
                job.etaSeconds = nil
                job.filePath = event.filePath
                job.fileSizeMB = event.fileSizeMB
                if let rawFormat = event.audioFormat, let format = AudioFormat(rawValue: rawFormat) {
                    job.audioFormat = format
                }
            }

        case .skipped:
            updateJob(matching: event.track) { job in
                job.status = .skipped
                job.message = event.reason
                job.filePath = event.existingFile
                job.existingPlaylist = event.existingPlaylist
            }

        case .error:
            updateJob(matching: event.track) { job in
                job.status = .error
                job.message = event.message ?? event.errorCode ?? "Error desconocido"
            }

        case .playlistDone:
            bridgeStatusText = "Playlist completada"
            if let playlistName = event.playlist, let stats = event.stats {
                postCompletionNotification(for: playlistName, stats: stats)
            }
        }
    }

    private func updateJob(
        matching descriptor: EngineTrackDescriptor?,
        update: (inout DownloadJob) -> Void
    ) {
        guard let descriptor else {
            return
        }

        let normalizedArtist = descriptor.artist.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedTitle = descriptor.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        guard let index = jobs.firstIndex(where: {
            $0.track.artist.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == normalizedArtist &&
            $0.track.title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == normalizedTitle
        }) else {
            return
        }

        var job = jobs[index]
        update(&job)
        jobs[index] = job
    }

    private func markPlaylist(named playlistName: String, as status: DownloadState, message: String) {
        for index in jobs.indices where jobs[index].playlistName == playlistName {
            jobs[index].status = status
            jobs[index].message = message
        }
    }

    private func updateInFlightJobsForPause() {
        for index in jobs.indices where jobs[index].status == .downloading {
            jobs[index].status = .paused
        }
    }

    private func updatePausedJobsForResume() {
        for index in jobs.indices where jobs[index].status == .paused {
            jobs[index].status = jobs[index].progressPercent > 0 ? .downloading : .pending
        }
    }

    private func postCompletionNotification(for playlistName: String, stats: PlaylistStats) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized else {
                return
            }

            let content = UNMutableNotificationContent()
            content.title = "\(playlistName) descargada"
            content.body = "\(stats.completed) canciones completas, \(stats.skipped) omitidas, \(stats.errors) errores."
            content.sound = .default

            let request = UNNotificationRequest(
                identifier: "playlist.\(playlistName)",
                content: content,
                trigger: nil
            )

            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
        }
    }
}
