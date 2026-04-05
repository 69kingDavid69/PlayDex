import { useEffect } from 'react'
import PlaylistSidebar from './components/PlaylistSidebar'
import TrackList from './components/TrackList'
import DownloadQueue from './components/DownloadQueue'
import Settings from './components/Settings'
import EmptyState from './components/EmptyState'
import useDownloadStore from './store/downloadStore'

function App() {
  const { bootstrapIfNeeded, playlists, bridgeStatusText, lastErrorMessage } = useDownloadStore()

  useEffect(() => {
    bootstrapIfNeeded()
  }, [])

  const hasPlaylists = playlists.length > 0

  return (
    <div className="flex flex-col h-screen bg-surface-900">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-surface-700 bg-surface-800/80 backdrop-blur-sm shrink-0"
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-accent-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2a10 10 0 0 1 0 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold tracking-wide text-white">PlayDex</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <StatusPill text={bridgeStatusText} />
          <SettingsButton />
        </div>
      </header>

      {/* ── Error Banner ── */}
      {lastErrorMessage && <ErrorBanner message={lastErrorMessage} />}

      {/* ── Main Content: 3-Panel Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        <PlaylistSidebar />
        
        <main className="flex-1 overflow-hidden flex flex-col border-r border-surface-700">
          {hasPlaylists ? (
            <TrackList />
          ) : (
            <EmptyState />
          )}
        </main>
        
        <DownloadQueue />
      </div>

      {/* ── Settings Modal ── */}
      <Settings />
    </div>
  )
}

function StatusPill({ text }: { text: string }) {
  const isReady = text.includes('listo') || text.includes('OK')
  const isError = text.includes('Error') || text.includes('error')
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${isError ? 'bg-danger-500/15 text-danger-400' : isReady ? 'bg-success-500/15 text-success-400' : 'bg-surface-600 text-surface-200'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-danger-500' : isReady ? 'bg-success-500' : 'bg-surface-300 animate-pulse'}`} />
      <span className="truncate max-w-48">{text}</span>
    </div>
  )
}

function SettingsButton() {
  const openSettings = useDownloadStore(s => s.openSettings)
  
  return (
    <button
      onClick={openSettings}
      className="p-2 rounded-lg text-surface-200 hover:text-white hover:bg-surface-600 transition-all duration-200"
      title="Ajustes"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  const clearError = () => useDownloadStore.setState({ lastErrorMessage: null })
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-danger-500/10 border-b border-danger-500/20 animate-fade-in shrink-0">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span className="text-sm text-danger-400">{message}</span>
      </div>
      <button onClick={clearError} className="text-danger-400 hover:text-white text-xs font-medium px-2 py-1 rounded hover:bg-danger-500/20 transition-colors">
        Cerrar
      </button>
    </div>
  )
}

export default App