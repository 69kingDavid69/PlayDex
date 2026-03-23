import AppKit
import SwiftUI

@main
struct PlayDexApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var settings: SettingsStore
    @StateObject private var downloadManager: DownloadManager

    init() {
        let settings = SettingsStore()
        _settings = StateObject(wrappedValue: settings)
        _downloadManager = StateObject(wrappedValue: DownloadManager(settings: settings))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(downloadManager)
                .environmentObject(settings)
                .frame(minWidth: 1180, minHeight: 720)
        }
        .defaultSize(width: 1280, height: 800)

        Settings {
            SettingsView()
                .environmentObject(settings)
                .environmentObject(downloadManager)
        }

        MenuBarExtra(
            "PlayDex",
            systemImage: downloadManager.isDownloading ? "music.note.house.fill" : "music.note.house"
        ) {
            VStack(alignment: .leading, spacing: 12) {
                Text("PlayDex")
                    .font(.headline)

                Text(downloadManager.menuBarStatusText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Divider()

                if let playlist = downloadManager.selectedPlaylist {
                    Label(playlist.name, systemImage: "music.note.list")
                    Text("\(playlist.trackCount) canciones")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Sin playlist seleccionada")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()

                Button("Abrir ventana principal") {
                    openMainWindow()
                }

                Button("Importar XML...") {
                    openMainWindow()
                    downloadManager.importLibraryXML()
                }

                Button(downloadManager.isPaused ? "Reanudar" : "Pausar") {
                    if downloadManager.isPaused {
                        downloadManager.resumeAll()
                    } else {
                        downloadManager.pauseAll()
                    }
                }
                .disabled(!downloadManager.hasQueuedJobs)

                Button("Cancelar cola") {
                    downloadManager.cancelAll()
                }
                .disabled(!downloadManager.hasQueuedJobs)

                Divider()

                Button("Salir") {
                    NSApp.terminate(nil)
                }
            }
            .padding(12)
            .frame(minWidth: 260)
        }
        .commands {
            CommandMenu("Biblioteca") {
                Button("Importar XML...") {
                    openMainWindow()
                    downloadManager.importLibraryXML()
                }
                .keyboardShortcut("o", modifiers: [.command, .shift])

                Button("Recargar playlists") {
                    Task {
                        await downloadManager.reloadPlaylists()
                    }
                }
                .keyboardShortcut("r", modifiers: [.command, .shift])

                if let xmlURL = settings.customLibraryXMLURL {
                    Divider()

                    Button("Mostrar XML actual en Finder") {
                        downloadManager.revealImportedLibraryXML()
                    }

                    Button("Quitar XML actual") {
                        downloadManager.clearImportedLibraryXML()
                    }

                    Button(xmlURL.lastPathComponent) {}
                        .disabled(true)
                }
            }
        }
    }

    private func openMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        NSApp.windows.first(where: { $0.canBecomeKey })?.makeKeyAndOrderFront(nil)
    }
}
