import useDownloadStore from '../store/downloadStore'

// Paleta de portadas: cada playlist toma un tono estable según su posición.
const COVERS = [
  { bg: '#2a0d08', ink: '#ff2a00' },
  { bg: '#2a1a0c', ink: '#ff8c00' },
  { bg: '#1c1230', ink: '#a46bff' },
  { bg: '#2e1420', ink: '#ff6b8a' },
  { bg: '#241c14', ink: '#c8b49a' },
]

export function coverFor(index: number) {
  return COVERS[index % COVERS.length]
}

export default function PlaylistSidebar() {
  const { playlists, selectedPlaylistId, selectPlaylist, importLibraryXML, importCSV, jobs } = useDownloadStore()
  const active = jobs.filter(j => j.status === 'pending' || j.status === 'downloading' || j.status === 'paused').length

  return (
    <aside className="w-68 shrink-0 flex flex-col gap-6 px-4 pt-6 pb-5 bg-surface-800 border-r border-surface-500/60 overflow-hidden" style={{ width: 272 }}>
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-2">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="14" stroke="#e8d8c8" strokeWidth="2" />
          <circle cx="16" cy="16" r="5" fill="#ff2a00" />
          <path d="M16 2a14 14 0 0 1 0 28" stroke="#ff2a00" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="font-display text-xl font-bold tracking-tight text-white">PlayDex</span>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex flex-col gap-1" aria-label="Principal">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-600 text-sm font-semibold text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Biblioteca
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-surface-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargas
          {active > 0 && (
            <span className="ml-auto text-xs font-bold text-ink bg-accent-500 rounded-full px-2 py-0.5">{active}</span>
          )}
        </div>
      </nav>

      {/* ── Playlists ── */}
      <div className="flex flex-col gap-2.5 min-h-0 flex-1">
        <h2 className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-surface-300">Playlists</h2>

        <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          {playlists.length === 0 ? (
            <div className="px-4 py-7 rounded-2xl border border-dashed border-surface-500 text-center text-[13px] leading-relaxed text-surface-300">
              Importa una playlist para comenzar
            </div>
          ) : (
            <ul className="space-y-0.5">
              {playlists.map((playlist, index) => {
                const isSelected = selectedPlaylistId === playlist.id
                const cover = coverFor(index)
                return (
                  <li key={playlist.id}>
                    <button
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 cursor-pointer ${
                        isSelected ? 'bg-surface-600' : 'hover:bg-surface-700'
                      }`}
                      onClick={() => selectPlaylist(playlist.id)}
                    >
                      <div className="w-10 h-10 shrink-0 rounded-[10px] flex items-center justify-center" style={{ background: cover.bg }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cover.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-surface-100'}`}>
                          {playlist.name}
                        </div>
                        <div className="text-xs text-surface-300 mt-0.5">{playlist.tracks.length} canciones</div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Importar ── */}
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center gap-2.5 px-3.5 py-3 text-left text-[13px] font-semibold text-white rounded-xl border border-dashed border-surface-400 hover:border-accent-500/60 hover:bg-surface-700 transition-colors cursor-pointer"
          onClick={importLibraryXML}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Importar XML de iTunes
        </button>
        <button
          className="flex items-center gap-2.5 px-3.5 py-3 text-left text-[13px] font-semibold text-white rounded-xl border border-dashed border-surface-400 hover:border-accent-500/60 hover:bg-surface-700 transition-colors cursor-pointer"
          onClick={importCSV}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
          </svg>
          Importar CSV de Spotify
        </button>
      </div>
    </aside>
  )
}
