import AppKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var downloadManager: DownloadManager
    @EnvironmentObject private var settings: SettingsStore

    var body: some View {
        NavigationSplitView {
            PlaylistSidebarView()
        } content: {
            TrackListView()
        } detail: {
            DownloadQueueView()
        }
        .navigationSplitViewStyle(.balanced)
        .background(
            TitleBarStatusAccessoryHost(
                xmlFileName: settings.customLibraryXMLURL?.lastPathComponent,
                statusIconName: statusIconName,
                statusText: downloadManager.bridgeStatusText
            )
            .frame(width: 0, height: 0)
        )
        .task {
            await downloadManager.bootstrapIfNeeded()
        }
        .alert("Error", isPresented: errorBinding) {
            Button("Cerrar", role: .cancel) {
                downloadManager.lastErrorMessage = nil
            }
        } message: {
            Text(downloadManager.lastErrorMessage ?? "")
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { downloadManager.lastErrorMessage != nil },
            set: { isPresented in
                if !isPresented {
                    downloadManager.lastErrorMessage = nil
                }
            }
        )
    }

    private var statusIconName: String {
        if downloadManager.isDownloading {
            return "arrow.down.circle.fill"
        }

        if downloadManager.hasQueuedJobs {
            return "music.note.list"
        }

        return "checkmark.circle"
    }
}

private struct TitleBarStatusAccessoryHost: NSViewRepresentable {
    let xmlFileName: String?
    let statusIconName: String
    let statusText: String

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> AccessoryAnchorView {
        let view = AccessoryAnchorView()
        view.coordinator = context.coordinator
        context.coordinator.update(
            xmlFileName: xmlFileName,
            statusIconName: statusIconName,
            statusText: statusText
        )
        return view
    }

    func updateNSView(_ nsView: AccessoryAnchorView, context: Context) {
        context.coordinator.update(
            xmlFileName: xmlFileName,
            statusIconName: statusIconName,
            statusText: statusText
        )

        if let window = nsView.window {
            context.coordinator.attachIfNeeded(to: window)
        }
    }

    final class AccessoryAnchorView: NSView {
        weak var coordinator: Coordinator?

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()

            if let window {
                coordinator?.attachIfNeeded(to: window)
            }
        }
    }

    @MainActor
    final class Coordinator {
        private weak var window: NSWindow?
        private var accessoryController: NSTitlebarAccessoryViewController?
        private var hostingView: NSHostingView<TitleBarStatusAccessoryContent>?
        private var xmlFileName: String?
        private var statusIconName = "checkmark.circle"
        private var statusText = ""

        func update(xmlFileName: String?, statusIconName: String, statusText: String) {
            self.xmlFileName = xmlFileName
            self.statusIconName = statusIconName
            self.statusText = statusText

            let rootView = TitleBarStatusAccessoryContent(
                xmlFileName: xmlFileName,
                statusIconName: statusIconName,
                statusText: statusText
            )

            guard let hostingView else {
                return
            }

            hostingView.rootView = rootView
            let contentSize = hostingView.fittingSize
            let barHeight = window.map { $0.frame.height - $0.contentLayoutRect.maxY } ?? contentSize.height
            let frameSize = NSSize(width: contentSize.width, height: max(contentSize.height, barHeight))
            hostingView.setFrameSize(frameSize)
            accessoryController?.view.setFrameSize(frameSize)
        }

        func attachIfNeeded(to window: NSWindow) {
            if self.window === window, accessoryController != nil {
                update(
                    xmlFileName: xmlFileName,
                    statusIconName: statusIconName,
                    statusText: statusText
                )
                return
            }

            detachIfNeeded()

            let rootView = TitleBarStatusAccessoryContent(
                xmlFileName: xmlFileName,
                statusIconName: statusIconName,
                statusText: statusText
            )
            let hostingView = NSHostingView(rootView: rootView)
            let contentSize = hostingView.fittingSize
            let barHeight = window.frame.height - window.contentLayoutRect.maxY
            let frameSize = NSSize(width: contentSize.width, height: max(contentSize.height, barHeight))
            hostingView.setFrameSize(frameSize)

            let controller = NSTitlebarAccessoryViewController()
            controller.layoutAttribute = .right
            controller.view = hostingView
            controller.fullScreenMinHeight = barHeight

            window.addTitlebarAccessoryViewController(controller)

            self.window = window
            self.hostingView = hostingView
            self.accessoryController = controller
        }

        private func detachIfNeeded() {
            guard
                let window,
                let accessoryController,
                let index = window.titlebarAccessoryViewControllers.firstIndex(where: { $0 === accessoryController })
            else {
                return
            }

            window.removeTitlebarAccessoryViewController(at: index)
            self.window = nil
            self.hostingView = nil
            self.accessoryController = nil
        }
    }
}

private struct TitleBarStatusAccessoryContent: View {
    let xmlFileName: String?
    let statusIconName: String
    let statusText: String

    var body: some View {
        HStack(spacing: 10) {
            if let xmlFileName {
                Image(systemName: "doc.text")
                    .help("XML activo: \(xmlFileName)")
            }

            Image(systemName: statusIconName)
                .help(statusText)
        }
        .font(.system(size: 15, weight: .medium))
        .foregroundStyle(.secondary)
        .frame(maxHeight: .infinity)
        .padding(.vertical, 4)
    }
}
