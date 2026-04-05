import useDownloadStore from '../store/downloadStore'

export default function EmptyState() {
  const { importLibraryXML, importCSV } = useDownloadStore()

  return (
    <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
      <div className="max-w-lg text-center">
        {/* Animated icon */}
        <div className="relative mb-8 inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/10 flex items-center justify-center mx-auto animate-pulse-glow">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="text-accent-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2a10 10 0 0 1 0 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
          Bienvenido a PlayDex
        </h1>
        <p className="text-surface-200 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
          Importa tus playlists desde iTunes (XML) o Spotify (CSV) y descárgalas en alta calidad desde Deezer.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={importLibraryXML}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-surface-700 border border-surface-600 rounded-2xl hover:border-accent-500/40 hover:bg-surface-600 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white group-hover:text-accent-300 transition-colors">
                Importar XML
              </div>
              <div className="text-[11px] text-surface-300">
                iTunes / Apple Music
              </div>
            </div>
          </button>

          <button
            onClick={importCSV}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-surface-700 border border-surface-600 rounded-2xl hover:border-success-500/40 hover:bg-surface-600 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-success-500/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-success-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white group-hover:text-success-300 transition-colors">
                Importar CSV
              </div>
              <div className="text-[11px] text-surface-300">
                Spotify (Exportify)
              </div>
            </div>
          </button>
        </div>

        {/* Getting started card */}
        <div className="mt-10 p-5 rounded-2xl bg-surface-700/40 border border-surface-600/50 text-left max-w-md mx-auto">
          <h3 className="text-sm font-semibold text-surface-100 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            ¿Primera vez?
          </h3>
          <ol className="space-y-2 text-xs text-surface-300 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-accent-400 font-bold shrink-0">1.</span>
              Exporta tu biblioteca de iTunes/Music como XML (Archivo → Biblioteca → Exportar…)
            </li>
            <li className="flex gap-2">
              <span className="text-accent-400 font-bold shrink-0">2.</span>
              Exporta tus playlists de Spotify con{' '}
              <a href="https://exportify.net" className="text-accent-400 hover:text-accent-300 underline underline-offset-2" target="_blank" rel="noreferrer">
                Exportify
              </a>
            </li>
            <li className="flex gap-2">
              <span className="text-accent-400 font-bold shrink-0">3.</span>
              Configura tu token ARL de Deezer en Ajustes
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}