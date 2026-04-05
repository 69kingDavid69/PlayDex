import useDownloadStore from '../store/downloadStore'

export default function TrackList() {
  const { selectedPlaylist, queueSelectedPlaylist } = useDownloadStore()
  const selected = selectedPlaylist()

  if (!selected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-surface-500 mx-auto mb-3">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="text-surface-300 text-sm">Selecciona una playlist</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0 bg-surface-800/40">
        <div>
          <h1 className="text-xl font-bold text-white">{selected.name}</h1>
          <p className="text-xs text-surface-300 mt-0.5">
            {selected.tracks.length} canciones · {selected.source === 'csvLibrary' ? 'Spotify' : 'iTunes/Music'}
          </p>
        </div>
        <button 
          className="btn-success flex items-center gap-2"
          onClick={queueSelectedPlaylist}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar playlist
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-800 border-b border-surface-700">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-surface-300 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-surface-300 uppercase tracking-wider">Título</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-surface-300 uppercase tracking-wider">Artista</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-surface-300 uppercase tracking-wider hidden xl:table-cell">Álbum</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-surface-300 uppercase tracking-wider w-20">Duración</th>
            </tr>
          </thead>
          <tbody>
            {selected.tracks.map((track, index) => (
              <tr 
                key={track.id} 
                className="border-b border-surface-700/40 hover:bg-surface-700/30 transition-colors duration-100 group"
              >
                <td className="px-4 py-2.5 text-sm text-surface-400 tabular-nums">{index + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="text-sm font-medium text-surface-100 group-hover:text-white transition-colors">
                    {track.title}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-surface-200">{track.artist}</td>
                <td className="px-4 py-2.5 text-sm text-surface-300 hidden xl:table-cell">{track.album || '—'}</td>
                <td className="px-4 py-2.5 text-sm text-surface-300 text-right tabular-nums">
                  {track.durationSeconds 
                    ? `${Math.floor(track.durationSeconds / 60)}:${(track.durationSeconds % 60).toString().padStart(2, '0')}` 
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}