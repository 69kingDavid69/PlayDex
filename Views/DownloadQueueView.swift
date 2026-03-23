import SwiftUI

struct DownloadQueueView: View {
    @EnvironmentObject private var downloadManager: DownloadManager

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Cola de descarga")
                    .font(.title3.weight(.semibold))

                Spacer()

                Button(downloadManager.isPaused ? "Reanudar" : "Pausar") {
                    if downloadManager.isPaused {
                        downloadManager.resumeAll()
                    } else {
                        downloadManager.pauseAll()
                    }
                }
                .disabled(!downloadManager.hasQueuedJobs)

                Button("Cancelar") {
                    downloadManager.cancelAll()
                }
                .disabled(!downloadManager.hasQueuedJobs)
            }

            summaryChips

            if downloadManager.jobs.isEmpty {
                EmptyStateView(
                    title: "Sin descargas",
                    systemImage: "tray",
                    message: "Selecciona una playlist para poblar la cola y enviar el lote al backend Python."
                )
            } else {
                List(downloadManager.jobs) { job in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(job.track.title)
                                    .font(.headline)
                                Text(job.track.artist)
                                    .foregroundStyle(.secondary)
                                Text(job.playlistName)
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }

                            Spacer()

                            if let audioFormat = job.audioFormat {
                                Text(audioFormat.badgeTitle)
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(audioFormat == .flac ? Color.green.opacity(0.16) : Color.blue.opacity(0.16))
                                    .clipShape(Capsule())
                            }
                        }

                        if job.status == .downloading {
                            ProgressView(value: job.progressPercent, total: 100.0)
                        }

                        HStack {
                            Text(job.statusLabel)
                                .font(.caption)
                                .foregroundStyle(statusColor(for: job))

                            Spacer()

                            if let speed = job.speedKbps {
                                Text("\(Int(speed)) kbps")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.inset)
            }
        }
        .padding()
    }

    private var summaryChips: some View {
        let summary = downloadManager.queueSummary

        return HStack(spacing: 10) {
            summaryChip(title: "Pendientes", value: summary.pending, color: .secondary)
            summaryChip(title: "Descargando", value: summary.downloading, color: .blue)
            summaryChip(title: "Completadas", value: summary.completed, color: .green)
            summaryChip(title: "Omitidas", value: summary.skipped, color: .gray)
            summaryChip(title: "Errores", value: summary.errors, color: .red)
        }
    }

    private func summaryChip(title: String, value: Int, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(value)")
                .font(.title3.weight(.semibold))
                .foregroundStyle(color)
        }
        .padding(10)
        .background(Color.secondary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
