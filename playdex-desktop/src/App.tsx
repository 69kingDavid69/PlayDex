import { useEffect } from 'react'
import PlaylistSidebar from './components/PlaylistSidebar'
import TrackList from './components/TrackList'
import DownloadQueue from './components/DownloadQueue'
import Settings from './components/Settings'
import EmptyState from './components/EmptyState'
import useDownloadStore from './store/downloadStore'

const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function App() {
  const { bootstrapIfNeeded, playlists, selectedPlaylist, bridgeStatusText, lastErrorMessage, engineStarted, restartEngine } = useDownloadStore()

  useEffect(() => {
    bootstrapIfNeeded()
  }, [])

  const hasPlaylists = playlists.length > 0
  const current = selectedPlaylist()

  return (
    <div className="flex h-screen bg-surface-900">
      <PlaylistSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between h-16 px-10 shrink-0" style={drag}>
          <div className="text-[13px] font-semibold text-surface-300" style={noDrag}>
            Biblioteca
            {current && (
              <>
                <span className="px-1.5">/</span>
                <span className="text-white">{current.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3" style={noDrag}>
            {!engineStarted && (
              <button onClick={restartEngine} className="btn-secondary !py-1.5 !px-3.5 !text-xs" title="Reintentar inicialización">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="inline-block mr-1.5 -mt-0.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-8.4l5.67 1.33" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Reiniciar engine
              </button>
            )}
            <StatusPill text={bridgeStatusText} />
            <SettingsButton />
          </div>
        </header>

        {lastErrorMessage && <ErrorBanner message={lastErrorMessage} />}

        <main className="flex-1 min-h-0 flex flex-col">
          {hasPlaylists ? <TrackList /> : <EmptyState />}
        </main>
      </div>

      <DownloadQueue />
      <Settings />
    </div>
  )
}

function StatusPill({ text }: { text: string }) {
  const isReady = text.includes('listo') || text.includes('OK')
  const isError = text.includes('Error') || text.includes('error')

  const tone = isError
    ? 'bg-danger-500/10 border-danger-500/25 text-danger-400'
    : isReady
      ? 'bg-accent-500/10 border-accent-500/20 text-accent-400'
      : 'bg-surface-700 border-surface-500 text-surface-200'
  const dot = isError ? 'bg-danger-500' : isReady ? 'bg-accent-500' : 'bg-surface-200 animate-pulse'

  return (
    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${tone}`}>
      <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />
      <span className="truncate max-w-56">{text}</span>
    </div>
  )
}

function SettingsButton() {
  const openSettings = useDownloadStore(s => s.openSettings)

  return (
    <button onClick={openSettings} className="icon-btn" title="Ajustes" aria-label="Ajustes">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="6" r="2.2" fill="#140c0d" />
        <circle cx="15" cy="12" r="2.2" fill="#140c0d" />
        <circle cx="8" cy="18" r="2.2" fill="#140c0d" />
      </svg>
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  const clearError = () => useDownloadStore.setState({ lastErrorMessage: null })

  return (
    <div className="mx-10 mb-3 flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-danger-500/10 border border-danger-500/25 animate-fade-in shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger-400 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm text-danger-400 truncate" title={message}>{message}</span>
      </div>
      <button onClick={clearError} className="btn-ghost !py-1 !px-3 !text-xs shrink-0">
        Cerrar
      </button>
    </div>
  )
}

export default App
