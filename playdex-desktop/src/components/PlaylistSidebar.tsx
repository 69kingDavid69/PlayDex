import useDownloadStore from '../store/downloadStore'

export default function PlaylistSidebar() {
  const { playlists, selectedPlaylistId, selectPlaylist, importLibraryXML, importCSV } = useDownloadStore()

  return (
    <aside className="w-60 border-r border-surface-700 bg-surface-800 flex flex-col shrink-0 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-surface-300">Playlists</h2>
      </div>

      {/* ── Playlist List ── */}
      <div className="flex-1 overflow-y-auto px-2">
        {playlists.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <div className="text-surface-400 text-xs">
              Importa una playlist para comenzar
            </div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {playlists.map((playlist) => {
              const isSelected = selectedPlaylistId === playlist.id
              return (
                <li key={playlist.id}>
                  <button
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                      isSelected
                        ? 'bg-accent-500/15 text-accent-300'
                        : 'hover:bg-surface-600/60 text-surface-100'
                    }`}
                    onClick={() => selectPlaylist(playlist.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        isSelected ? 'bg-accent-500/20' : 'bg-surface-600'
                      }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                          className={isSelected ? 'text-accent-400' : 'text-surface-300'}>
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-accent-300' : 'text-surface-100'}`}>
                          {playlist.name}
                        </div>
                        <div className="text-[11px] text-surface-300">
                          {playlist.tracks.length} canciones
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Import Actions ── */}
      <div className="px-3 py-3 border-t border-surface-700 space-y-1.5">
        <button 
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all duration-150"
          onClick={importLibraryXML}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Importar XML iTunes</span>
        </button>
        <button 
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-success-400 hover:bg-success-500/10 rounded-lg transition-all duration-150"
          onClick={importCSV}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
          </svg>
          <span>Importar CSV Spotify</span>
        </button>
      </div>
    </aside>
  )
}