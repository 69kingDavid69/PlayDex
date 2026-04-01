import useDownloadStore from '../store/downloadStore'

export default function TrackList() {
  const { selectedPlaylist, queueSelectedPlaylist } = useDownloadStore()
  const selected = selectedPlaylist()

  if (!selected) {
    return <div className="p-8 text-center text-gray-500">Selecciona una playlist</div>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{selected.name}</h1>
        <button 
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={queueSelectedPlaylist}
        >
          Descargar playlist
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artista</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Álbum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {selected.tracks.map((track, index) => (
              <tr key={track.id}>
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{track.title}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{track.artist}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{track.album || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {track.durationSeconds ? `${Math.floor(track.durationSeconds / 60)}:${(track.durationSeconds % 60).toString().padStart(2, '0')}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}