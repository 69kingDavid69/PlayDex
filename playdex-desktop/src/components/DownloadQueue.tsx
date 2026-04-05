import useDownloadStore from '../store/downloadStore'

export default function DownloadQueue() {
  const { jobs, isPaused, pauseAll, resumeAll, cancelAll, queueSummary } = useDownloadStore()
  const summary = queueSummary()

  return (
    <aside className="w-80 bg-surface-800 flex flex-col shrink-0 overflow-hidden border-l border-surface-700">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-700 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-surface-300">Cola de descarga</h2>
          {jobs.length > 0 && (
            <div className="flex gap-1.5">
              {isPaused ? (
                <button onClick={resumeAll} className="btn-ghost text-xs py-1 px-2.5" title="Reanudar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              ) : (
                <button onClick={pauseAll} className="btn-ghost text-xs py-1 px-2.5" title="Pausar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                </button>
              )}
              <button onClick={cancelAll} className="btn-ghost text-xs py-1 px-2.5 hover:!text-danger-400" title="Cancelar todo">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* ── Summary Chips ── */}
        <div className="grid grid-cols-3 gap-1.5">
          <SummaryChip label="Descargando" value={summary.downloading} colorClass="text-info-400" />
          <SummaryChip label="Completadas" value={summary.completed} colorClass="text-success-400" />
          <SummaryChip label="Errores" value={summary.errors} colorClass="text-danger-400" />
        </div>
        {(summary.pending > 0 || summary.skipped > 0) && (
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            <SummaryChip label="Pendientes" value={summary.pending} colorClass="text-surface-200" />
            <SummaryChip label="Omitidas" value={summary.skipped} colorClass="text-warning-500" />
            <SummaryChip label="Total" value={summary.total} colorClass="text-accent-400" />
          </div>
        )}
      </div>

      {/* ── Job List ── */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-surface-500 mb-3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p className="text-surface-400 text-xs">Sin descargas</p>
            <p className="text-surface-500 text-[11px] mt-1">Selecciona una playlist y presiona descargar</p>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {jobs.map((job, i) => (
              <li 
                key={job.id} 
                className="p-3 rounded-lg bg-surface-700/30 hover:bg-surface-700/60 transition-all duration-150 animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-surface-100 truncate">{job.track.title}</div>
                    <div className="text-[11px] text-surface-300 truncate">{job.track.artist}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={job.status} />
                    {job.audioFormat && (
                      <span className={`badge ${job.audioFormat === 'FLAC' ? 'badge-format-flac' : 'badge-format'}`}>
                        {job.audioFormat}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar for downloading */}
                {job.status === 'downloading' && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] text-surface-300 mb-1">
                      <span>{job.progressPercent.toFixed(1)}%</span>
                      <span className="flex gap-2">
                        {job.speedKbps && <span>{job.speedKbps.toFixed(0)} kbps</span>}
                        {job.etaSeconds && <span>{job.etaSeconds}s</span>}
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${job.progressPercent}%` }} 
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {job.status === 'error' && job.message && (
                  <div className="mt-1.5 text-[10px] text-danger-400 truncate" title={job.message}>
                    {job.message}
                  </div>
                )}

                {/* Skipped message */}
                {job.status === 'skipped' && job.message && (
                  <div className="mt-1.5 text-[10px] text-warning-500 truncate" title={job.message}>
                    {job.message}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function SummaryChip({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="summary-chip">
      <div className="text-[10px] text-surface-300 mb-0.5">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendiente', className: 'badge-pending' },
    downloading: { label: 'Descargando', className: 'badge-downloading' },
    completed: { label: 'Completado', className: 'badge-completed' },
    error: { label: 'Error', className: 'badge-error' },
    skipped: { label: 'Omitida', className: 'badge-skipped' },
    paused: { label: 'Pausado', className: 'badge-pending' },
  }
  
  const { label, className } = config[status] || config.pending
  
  return <span className={`badge ${className}`}>{label}</span>
}