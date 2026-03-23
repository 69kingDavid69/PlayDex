import SwiftUI

struct PlaylistSidebarView: View {
    @EnvironmentObject private var downloadManager: DownloadManager
    @EnvironmentObject private var settings: SettingsStore

    var body: some View {
        List(selection: playlistSelection) {
            ForEach(downloadManager.playlists) { playlist in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: playlist.source == .csvLibrary ? "tablecells" : "music.note.list")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(playlist.name)
                            .font(.headline)
                    }
                    Text("\(playlist.trackCount) canciones")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .tag(playlist.id)
            }
        }
        .navigationTitle("Playlists")
        .safeAreaInset(edge: .bottom) {
            libraryFooter
        }
    }

    private var playlistSelection: Binding<Playlist.ID?> {
        Binding(
            get: { downloadManager.selectedPlaylistID },
            set: { downloadManager.selectedPlaylistID = $0 }
        )
    }

    @ViewBuilder
    private var libraryFooter: some View {
        VStack(alignment: .leading, spacing: 10) {

            // XML status
            if let xmlURL = settings.customLibraryXMLURL {
                VStack(alignment: .leading, spacing: 4) {
                    Text("XML activo")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(xmlURL.lastPathComponent)
                        .font(.caption)
                        .lineLimit(2)
                }
            }

            // CSV status
            if let csvURL = downloadManager.csvPlaylistURL {
                VStack(alignment: .leading, spacing: 4) {
                    Text("CSV activo")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(csvURL.lastPathComponent)
                        .font(.caption)
                        .lineLimit(2)
                }
            }

            if settings.customLibraryXMLURL == nil && downloadManager.csvPlaylistURL == nil {
                Text("Importa un XML desde Music o un CSV de Spotify para cargar playlists.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Import row
            HStack(spacing: 8) {
                Button(settings.customLibraryXMLURL == nil ? "Importar XML..." : "Nuevo XML...") {
                    downloadManager.importLibraryXML()
                }
                .buttonStyle(.borderedProminent)

                Button(downloadManager.csvPlaylistURL == nil ? "Importar CSV..." : "Nuevo CSV...") {
                    downloadManager.importCSV()
                }
                .buttonStyle(.bordered)

                Button("Recargar") {
                    Task { await downloadManager.reloadPlaylists() }
                }
                .buttonStyle(.bordered)
            }

            // Remove row
            HStack(spacing: 8) {
                if settings.customLibraryXMLURL != nil {
                    Button("Mostrar XML") {
                        downloadManager.revealImportedLibraryXML()
                    }
                    .buttonStyle(.bordered)

                    Button("Quitar XML") {
                        downloadManager.clearImportedLibraryXML()
                    }
                    .buttonStyle(.bordered)
                }

                if downloadManager.csvPlaylistURL != nil {
                    Button("Quitar CSV") {
                        downloadManager.clearImportedCSV()
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .overlay(alignment: .top) {
            Divider()
        }
    }
}
