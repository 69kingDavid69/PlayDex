import useDownloadStore from '../store/downloadStore'

const TRACK_COLORS = ['#2a0d08', '#1c1230', '#2a1a0c', '#2e1420', '#241c14', '#221030', '#1b1112']

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En cola', className: 'badge-pending' },
  paused: { label: 'Pausada', className: 'badge-pending' },
  downloading: { label: 'Descargando', className: 'badge-downloading' },
  completed: { label: 'Completada', className: 'badge-completed' },
  skipped: { label: 'Omitida', className: 'badge-skipped' },
  error: { label: 'Error', className: 'badge-error' },
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—'
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}

function formatTotal(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

const GRID = 'grid grid-cols-[48px_minmax(0,2.2fr)_minmax(0,1.4fr)_150px_64px] items-center'

export default function TrackList() {
  const { selectedPlaylist, queueSelectedPlaylist, engineStarted, downloadReady, preferredFormat, jobs } = useDownloadStore()
  const selected = selectedPlaylist()

  if (!selected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-surface-400 mx-auto mb-3">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p className="text-surface-200 text-sm">Selecciona una playlist</p>
        </div>
      </div>
    )
  }

  const statusByTrack = new Map(jobs.filter(j => j.playlistName === selected.name).map(j => [j.track.id, j.status]))
  const totalSeconds = selected.tracks.reduce((sum, t) => sum + (t.durationSeconds ?? 0), 0)
  const sourceLabel = selected.source === 'csvLibrary' ? 'Spotify' : 'iTunes / Music'

  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fade-in">
      {/* ── Hero ── */}
      <section className="flex items-end gap-7 px-10 pt-2 pb-7 shrink-0">
        <div className="w-40 h-40 shrink-0 rounded-[22px] bg-[#2a0d08] border border-[#4a1a10] flex items-center justify-center shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
          <svg width="112" height="112" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <circle cx="60" cy="60" r="54" stroke="#6a2a1c" strokeWidth="2" />
            <circle cx="60" cy="60" r="40" stroke="#6a2a1c" strokeWidth="2" />
            <circle cx="60" cy="60" r="26" stroke="#6a2a1c" strokeWidth="2" />
            <circle cx="60" cy="60" r="10" fill="#ff2a00" />
          </svg>
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-accent-400">Playlist · {sourceLabel}</div>
          <h1 className="font-display text-[44px] leading-[1.05] font-bold tracking-tight text-white mt-2 mb-3.5 truncate" title={selected.name}>
            {selected.name}
          </h1>
          <div className="flex items-center gap-2.5 text-[13px] font-semibold text-surface-200">
            <span>{selected.tracks.length} canciones</span>
            {totalSeconds > 0 && (
              <>
                <span className="text-surface-400">●</span>
                <span>{formatTotal(totalSeconds)}</span>
              </>
            )}
            <span className="text-surface-400">●</span>
            <span className="chip-format chip-format-flac">{preferredFormat === 'FLAC' ? 'FLAC' : 'MP3 320'}</span>
          </div>
        </div>

        <button
          className="btn-primary !h-[52px] !px-7 !rounded-2xl !text-[15px] flex items-center gap-2.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:!transform-none disabled:hover:!shadow-none"
          onClick={queueSelectedPlaylist}
          disabled={!downloadReady}
          title={!engineStarted ? 'Engine no iniciado' : !downloadReady ? 'Falta el token ARL en Ajustes' : 'Descargar playlist'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar playlist
        </button>
      </section>

      {/* ── Tabla ── */}
      <section className="flex-1 min-h-0 mx-10 flex flex-col border-t border-surface-500/60">
        <div className={`${GRID} h-11 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-300 shrink-0`}>
          <span>#</span>
          <span>Título</span>
          <span>Álbum</span>
          <span>Estado</span>
          <span className="text-right">Dur.</span>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {selected.tracks.map((track, index) => {
            const status = statusByTrack.get(track.id)
            const badge = status ? STATUS[status] : null
            return (
              <div
                key={track.id}
                className={`${GRID} h-[58px] px-3 rounded-[14px] transition-colors duration-100 hover:bg-surface-700 ${status === 'downloading' ? 'bg-surface-700/70' : ''}`}
              >
                <span className="text-[13px] font-semibold text-surface-300 tabular-nums">{index + 1}</span>
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-[38px] h-[38px] shrink-0 rounded-[9px]" style={{ background: TRACK_COLORS[index % TRACK_COLORS.length] }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{track.title}</div>
                    <div className="text-xs text-surface-200 mt-0.5 truncate">{track.artist}</div>
                  </div>
                </div>
                <span className="text-[13px] text-surface-200 truncate pr-4">{track.album || '—'}</span>
                <span>{badge ? <span className={`badge ${badge.className}`}>{badge.label}</span> : null}</span>
                <span className="text-[13px] text-surface-200 text-right tabular-nums">{formatDuration(track.durationSeconds)}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
