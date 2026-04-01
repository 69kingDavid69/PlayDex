import useDownloadStore from '../store/downloadStore'

export default function EmptyState() {
  const { importLibraryXML, importCSV } = useDownloadStore()

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Bienvenido a PlayDex</h1>
        <p className="text-gray-600 mb-8">
          Importa tus playlists desde iTunes (XML) o Spotify (CSV) y descárgalas en alta calidad desde Deezer.
        </p>
        <div className="space-y-4">
          <button
            onClick={importLibraryXML}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar biblioteca de iTunes/Music (XML)
          </button>
          <button
            onClick={importCSV}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar playlist de Spotify (CSV)
          </button>
        </div>
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">¿Primera vez?</h3>
          <p className="text-sm text-gray-600">
            1. Exporta tu biblioteca de iTunes/Music como XML (Archivo → Biblioteca → Exportar…)<br />
            2. Exporta tus playlists de Spotify con <a href="https://exportify.net" className="text-blue-600 underline">Exportify</a><br />
            3. Configura tu token ARL de Deezer en Ajustes
          </p>
        </div>
      </div>
    </div>
  )
}