import { useState } from 'react'

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900"
      >
        Ajustes
      </button>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Ajustes</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carpeta de descargas
                </label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-l px-3 py-2"
                    placeholder="~/Music/PlayDex"
                  />
                  <button className="bg-gray-200 px-4 py-2 rounded-r border border-l-0 border-gray-300">
                    Examinar
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de audio preferido
                </label>
                <select className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="FLAC">FLAC (lossless)</option>
                  <option value="MP3_320">MP3 320 kbps</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Permitir fallback a calidad inferior</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Rechazar por debajo de 320 kbps</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token ARL de Deezer
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Pega tu token ARL aquí"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este token se guarda de forma segura en el keychain del sistema.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setIsOpen(false)} className="px-4 py-2 border border-gray-300 rounded">
                  Cancelar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}