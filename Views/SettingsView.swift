import AppKit
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var settings: SettingsStore
    @EnvironmentObject private var downloadManager: DownloadManager

    var body: some View {
        TabView {
            generalTab
                .tabItem { Label("General", systemImage: "gearshape") }

            qualityTab
                .tabItem { Label("Calidad", systemImage: "waveform") }

            deezerTab
                .tabItem { Label("Deezer", systemImage: "music.note") }

            advancedTab
                .tabItem { Label("Avanzado", systemImage: "slider.horizontal.3") }
        }
        .padding(20)
        .frame(width: 620, height: 430)
    }

    private var generalTab: some View {
        Form {
            Section {
                Text("Carpeta de destino")
                    .font(.headline)

                TextField("~/Music/PlayDex", text: $settings.downloadLocation)
                    .textFieldStyle(.roundedBorder)

                HStack {
                    Button("Cambiar...") {
                        chooseDownloadFolder()
                    }

                    Button("Abrir carpeta") {
                        NSWorkspace.shared.open(settings.expandedDownloadLocation)
                    }

                    Text(settings.expandedDownloadLocation.path)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text("Biblioteca Music/iTunes")
                    .font(.headline)

                if let customLibraryXMLURL = settings.customLibraryXMLURL {
                    Text(customLibraryXMLURL.lastPathComponent)
                        .font(.body.weight(.medium))
                    Text(customLibraryXMLURL.path)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Todavía no has importado un XML manual.")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Button(settings.customLibraryXMLURL == nil ? "Importar XML..." : "Reemplazar XML...") {
                        downloadManager.importLibraryXML()
                    }

                    Button("Recargar playlists") {
                        Task {
                            await downloadManager.reloadPlaylists()
                        }
                    }

                    if settings.customLibraryXMLURL != nil {
                        Button("Mostrar en Finder") {
                            downloadManager.revealImportedLibraryXML()
                        }

                        Button("Quitar XML") {
                            downloadManager.clearImportedLibraryXML()
                        }
                    }
                }

                if !settings.recentLibraryXMLURLs.isEmpty {
                    Text("Recientes")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    ForEach(settings.recentLibraryXMLURLs, id: \.path) { url in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(url.lastPathComponent)
                                    .font(.caption)
                                Text(url.path)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }

                            Spacer()

                            Button("Usar") {
                                downloadManager.selectImportedLibraryXML(url)
                            }
                            .buttonStyle(.link)
                        }
                    }
                }
            }
        }
    }

    private func chooseDownloadFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.canCreateDirectories = true
        panel.prompt = "Elegir carpeta"
        panel.message = "Selecciona la carpeta donde PlayDex guardará los archivos descargados."
        panel.directoryURL = settings.expandedDownloadLocation.deletingLastPathComponent()

        if panel.runModal() == .OK, let url = panel.url {
            settings.setDownloadLocation(url)
        }
    }

    private var qualityTab: some View {
        Form {
            Picker("Formato preferido", selection: $settings.preferredFormat) {
                ForEach(AudioFormat.allCases) { format in
                    Text(format.humanDescription).tag(format)
                }
            }

            Toggle("Si FLAC no esta disponible, usar MP3 320", isOn: $settings.allowFallback)
            Toggle("Rechazar calidades inferiores a 320 kbps", isOn: $settings.rejectBelow320)
        }
    }

    private var deezerTab: some View {
        Form {
            SecureField("Token ARL", text: $settings.arlToken)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button("Pegar desde portapapeles") {
                    pasteARLFromClipboard()
                }

                if !settings.arlToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button("Limpiar") {
                        settings.arlToken = ""
                    }
                }
            }

            Text(arlStatusText)
                .font(.caption)
                .foregroundStyle(arlStatusColor)

            Text("El token ARL se persiste en Keychain. El bridge Python lo recibe por variable de entorno y no desde `config.json`.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var arlStatusText: String {
        let trimmedToken = settings.arlToken.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmedToken.isEmpty {
            return "Pega aquí la cookie `arl` de tu sesión activa de Deezer para habilitar las descargas reales."
        }

        if trimmedToken.count < 20 {
            return "El ARL parece demasiado corto. Revisa que hayas copiado la cookie completa."
        }

        return "ARL guardado. La próxima descarga reiniciará el bridge con tu sesión actual."
    }

    private var arlStatusColor: Color {
        let trimmedToken = settings.arlToken.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmedToken.isEmpty {
            return .secondary
        }

        return trimmedToken.count < 20 ? .orange : .green
    }

    private func pasteARLFromClipboard() {
        guard let rawString = NSPasteboard.general.string(forType: .string) else {
            return
        }

        settings.arlToken = rawString.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var advancedTab: some View {
        Form {
            Stepper("Descargas paralelas: \(settings.parallelDownloads)", value: $settings.parallelDownloads, in: 1...8)
            Stepper("Reintentos por error: \(settings.retryCount)", value: $settings.retryCount, in: 0...5)

            Button("Sincronizar config del engine") {
                settings.persistEngineConfig()
            }

            Text(settings.engineConfigURL.path)
                .font(.caption)
                .foregroundStyle(.secondary)

            if let error = settings.lastPersistError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }
}
