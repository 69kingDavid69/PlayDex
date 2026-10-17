import useDownloadStore from '../store/downloadStore'

export default function DownloadQueue() {
  const { jobs, isPaused, pauseAll, resumeAll, cancelAll, queueSummary } = useDownloadStore()
  const summary = queueSummary()
  const current = jobs.find(j => j.status === 'downloading')
  const processed = summary.completed + summary.errors + summary.skipped
  const overall = summary.total > 0 ? (processed / summary.total) * 100 : 0
  const history = jobs.filter(j => j.id !== current?.id)

  return (
    <aside className="shrink-0 flex flex-col gap-5 px-5 py-6 bg-surface-800 border-l border-surface-500/60 overflow-hidden" style={{ width: 360 }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="font-display text-[17px] font-semibold text-white">Cola de descarga</h2>
        {jobs.length > 0 && (
          <div className="flex gap-2">
            {isPaused ? (
              <button onClick={resumeAll} className="icon-btn !w-[34px] !h-[34px] !rounded-[10px]" title="Reanudar" aria-label="Reanudar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              </button>
            ) : (
              <button onClick={pauseAll} className="icon-btn !w-[34px] !h-[34px] !rounded-[10px]" title="Pausar" aria-label="Pausar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              </button>
            )}
            <button onClick={cancelAll} className="icon-btn !w-[34px] !h-[34px] !rounded-[10px] !text-danger-400" title="Cancelar todo" aria-label="Cancelar todo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Progreso global ── */}
      <div className="shrink-0 p-[18px] rounded-[18px] bg-surface-600 border border-surface-500/70">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[34px] font-bold tracking-tight text-white">
            {processed}
            <span className="text-lg font-semibold text-surface-300"> / {summary.total}</span>
          </span>
          <span className="text-xs font-semibold text-surface-200">canciones procesadas</span>
        </div>
        <div className="progress-bar-track !h-1.5 mt-3.5 mb-4">
          <div className="progress-bar-fill" style={{ width: `${overall}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Descargando" value={summary.downloading} color="text-info-400" />
          <Stat label="Completadas" value={summary.completed} color="text-success-400" />
          <Stat label="Errores" value={summary.errors} color="text-danger-400" />
        </div>
        {(summary.pending > 0 || summary.skipped > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-surface-500/70">
            <Stat label="Pendientes" value={summary.pending} color="text-surface-100" />
            <Stat label="Omitidas" value={summary.skipped} color="text-warning-500" />
            <Stat label="Total" value={summary.total} color="text-white" />
          </div>
        )}
      </div>

      {/* ── Descargando ahora ── */}
      {current && (
        <div className="shrink-0 p-4 rounded-[18px] bg-[#1d0b09] border border-[#4a1a10] animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-400">Descargando ahora</span>
            {current.audioFormat && (
              <span className={`chip-format ${current.audioFormat === 'FLAC' ? 'chip-format-flac' : ''}`}>{current.audioFormat === 'FLAC' ? 'FLAC' : 'MP3 320'}</span>
            )}
          </div>
          <div className="text-[15px] font-bold text-white truncate">{current.track.title}</div>
          <div className="text-xs text-surface-200 mt-0.5 truncate">{current.track.artist}</div>
          <div className="progress-bar-track my-4 !bg-[#4a1a10]">
            <div className="progress-bar-fill" style={{ width: `${current.progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs font-semibold text-surface-200">
            <span className="text-white tabular-nums">{current.progressPercent.toFixed(1)}%</span>
            <span className="flex gap-2 tabular-nums">
              {current.speedKbps ? <span>{current.speedKbps.toFixed(0)} kbps</span> : null}
              {current.etaSeconds ? <span>{current.etaSeconds} s</span> : null}
            </span>
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      <div className="flex flex-col gap-1.5 min-h-0 flex-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-surface-300 mb-1 shrink-0">Historial</h3>
        <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-40 px-6 text-center rounded-[20px] border border-dashed border-surface-500">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400 mb-3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <p className="text-sm font-bold text-white">Sin descargas</p>
              <p className="text-[13px] leading-snug text-surface-300 mt-1">Elige una playlist y pulsa descargar para verla aquí.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {history.map((job, i) => (
                <li
                  key={job.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-700 animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
                >
                  <span className={`w-2 h-2 shrink-0 rounded-full ${dotColor(job.status)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-white truncate">{job.track.title}</div>
                    <div
                      className={`text-[11px] mt-0.5 truncate ${job.status === 'error' ? 'text-danger-400' : job.status === 'skipped' ? 'text-warning-500' : 'text-surface-300'}`}
                      title={job.message}
                    >
                      {(job.status === 'error' || job.status === 'skipped') && job.message ? job.message : job.track.artist}
                      {job.audioFormat && job.status === 'completed' ? ` · ${job.audioFormat === 'FLAC' ? 'FLAC' : 'MP3 320'}` : ''}
                    </div>
                  </div>
                  <StatusLabel status={job.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-surface-200 mt-0.5">{label}</div>
    </div>
  )
}

function dotColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-success-500'
    case 'error': return 'bg-danger-500'
    case 'skipped': return 'bg-warning-500'
    case 'downloading': return 'bg-info-500'
    default: return 'bg-surface-200'
  }
}

function StatusLabel({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Espera', color: 'text-surface-200' },
    downloading: { label: 'Bajando', color: 'text-info-400' },
    completed: { label: 'Listo', color: 'text-success-400' },
    error: { label: 'Error', color: 'text-danger-400' },
    skipped: { label: 'Omitida', color: 'text-warning-500' },
    paused: { label: 'Pausa', color: 'text-surface-200' },
    cancelled: { label: 'Cancelada', color: 'text-surface-300' },
  }
  const { label, color } = config[status] || config.pending
  return <span className={`text-[11px] font-bold ${color}`}>{label}</span>
}
