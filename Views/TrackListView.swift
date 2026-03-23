import SwiftUI

struct TrackListView: View {
    @EnvironmentObject private var downloadManager: DownloadManager

    var body: some View {
        if let playlist = downloadManager.selectedPlaylist {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(playlist.name)
                            .font(.title2.weight(.semibold))
                        Text("\(playlist.trackCount) canciones · \(playlist.source.rawValue)")
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Descargar playlist") {
                        downloadManager.queueSelectedPlaylist()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(playlist.tracks.isEmpty)
                }

                List(playlist.tracks) { track in
                    let job = downloadManager.job(for: track, in: playlist.name)

                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: iconName(for: job))
                            .foregroundStyle(iconColor(for: job))
                            .frame(width: 18)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(track.title)
                                .font(.headline)
                            Text(track.artist)
                                .foregroundStyle(.secondary)

                            if let album = track.album, !album.isEmpty {
                                Text(album)
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }

                            if let job, job.status == .downloading {
                                ProgressView(value: job.progressPercent, total: 100.0)
                                    .frame(maxWidth: 220)
                            }
                        }

                        Spacer()

                        if let job {
                            Text(job.statusLabel)
                                .font(.caption)
                                .foregroundStyle(statusColor(for: job))
                                .multilineTextAlignment(.trailing)
                        } else {
                            Text("Pendiente")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .help(job?.statusLabel ?? "Pendiente")
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            }
            .padding()
        } else {
            VStack(spacing: 18) {
                EmptyStateView(
                    title: "Sin playlists detectadas",
                    systemImage: "music.note.list",
                    message: downloadManager.libraryStatusMessage ?? "Importa un XML exportado desde Music para ver tus playlists."
                )

            }
        }
    }

    private func iconName(for job: DownloadJob?) -> String {
        guard let job else {
            return "circle"
        }

        switch job.status {
        case .pending:
            return "circle"
        case .downloading:
            return "arrow.down.circle.fill"
        case .completed:
            return "checkmark.circle.fill"
        case .skipped:
            return "arrow.uturn.forward.circle"
        case .error:
            return "xmark.circle.fill"
        case .paused:
            return "pause.circle.fill"
        }
    }

    private func iconColor(for job: DownloadJob?) -> Color {
        guard let job else {
            return .secondary
        }

        switch job.status {
        case .pending, .paused:
            return .secondary
        case .downloading:
            return .blue
        case .completed:
            return .green
        case .skipped:
            return .gray
        case .error:
            return .red
        }
    }

    private func statusColor(for job: DownloadJob) -> Color {
        switch job.status {
        case .pending, .paused, .skipped:
            return .secondary
        case .downloading:
            return .blue
        case .completed:
            return job.audioFormat == .flac ? .green : .blue
        case .error:
            return .red
        }
    }
}
