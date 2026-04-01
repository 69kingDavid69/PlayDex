import useDownloadStore from '../store/downloadStore'

export default function DownloadQueue() {
  const { jobs, isPaused, pauseAll, resumeAll, cancelAll } = useDownloadStore()

  const downloadingCount = jobs.filter(j => j.status === 'downloading').length
  const completedCount = jobs.filter(j => j.status === 'completed').length
  const errorCount = jobs.filter(j => j.status === 'error').length

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Cola de descarga</h2>
          <div className="flex space-x-2">
            {isPaused ? (
              <button onClick={resumeAll} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                Reanudar
              </button>
            ) : (
              <button onClick={pauseAll} className="px-3 py-1 bg-yellow-600 text-white rounded text-sm">
                Pausar
              </button>
            )}
            <button onClick={cancelAll} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
              Cancelar
            </button>
          </div>
        </div>
        <div className="mt-2 flex space-x-4 text-sm text-gray-600">
          <span>Descargando: <strong>{downloadingCount}</strong></span>
          <span>Completadas: <strong>{completedCount}</strong></span>
          <span>Errores: <strong>{errorCount}</strong></span>
          <span>Total: <strong>{jobs.length}</strong></span>
        </div>
        {jobs.length === 0 ? (
          <div className="mt-4 text-center text-gray-500 py-8">
            No hay descargas en curso
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {jobs.map(job => (
              <li key={job.id} className="p-3 border border-gray-200 rounded">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{job.track.title}</div>
                    <div className="text-sm text-gray-600">{job.track.artist}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${job.status === 'completed' ? 'text-green-600' : job.status === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                      {job.status === 'completed' ? 'Completado' : job.status === 'error' ? 'Error' : job.status === 'downloading' ? 'Descargando' : job.status}
                    </div>
                    {job.audioFormat && (
                      <div className="text-xs text-gray-500">{job.audioFormat}</div>
                    )}
                  </div>
                </div>
                {job.status === 'downloading' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{job.progressPercent.toFixed(1)}%</span>
                      {job.speedKbps && <span>{job.speedKbps.toFixed(0)} kbps</span>}
                      {job.etaSeconds && <span>{job.etaSeconds}s restantes</span>}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${job.progressPercent}%` }} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}