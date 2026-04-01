import useDownloadStore from '../store/downloadStore'

export default function PlaylistSidebar() {
  const { playlists, selectedPlaylistId, selectPlaylist, importLibraryXML, importCSV } = useDownloadStore()

  return (
    <aside className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800">Playlists</h2>
        <ul className="mt-4 space-y-2">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded ${selectedPlaylistId === playlist.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
                onClick={() => selectPlaylist(playlist.id)}
              >
                <div className="font-medium">{playlist.name}</div>
                <div className="text-sm text-gray-500">{playlist.tracks.length} canciones</div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2">
          <button 
            className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 rounded"
            onClick={importLibraryXML}
          >
            Importar XML de iTunes
          </button>
          <button 
            className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 rounded"
            onClick={importCSV}
          >
            Importar CSV de Spotify
          </button>
        </div>
      </div>
    </aside>
  )
}