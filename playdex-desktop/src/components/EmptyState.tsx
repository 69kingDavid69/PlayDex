import useDownloadStore from '../store/downloadStore'

const STEPS = [
  { title: 'Exporta de iTunes', text: 'Archivo → Biblioteca → Exportar biblioteca como XML.' },
  { title: 'Exporta de Spotify', text: null },
  { title: 'Conecta Deezer', text: 'Pega tu token ARL en Ajustes para poder descargar.' },
]

export default function EmptyState() {
  const { importLibraryXML, importCSV } = useDownloadStore()

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-10 pb-10 animate-fade-in">
      <div className="w-full max-w-[720px] flex flex-col items-center text-center">
        <div className="w-28 h-28 rounded-[32px] bg-[#2a0d08] border border-[#4a1a10] flex items-center justify-center animate-pulse-glow">
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#e8d8c8" strokeWidth="1.6" />
            <circle cx="16" cy="16" r="5" fill="#ff2a00" />
            <path d="M16 2a14 14 0 0 1 0 28" stroke="#ff2a00" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="font-display text-[48px] leading-[1.05] font-bold tracking-tight text-white mt-9 mb-3">
          Tu música, en alta calidad
        </h1>
        <p className="max-w-[520px] text-base leading-relaxed text-surface-200">
          Importa tus playlists de iTunes o Spotify y descárgalas en FLAC o MP3 320 desde Deezer.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full mt-10">
          <button
            onClick={importLibraryXML}
            className="group flex items-center gap-4 p-5 rounded-[20px] bg-surface-700 border border-surface-500 text-left cursor-pointer transition-all duration-150 hover:border-accent-500/50 hover:bg-surface-600"
          >
            <span className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-[#2a0d08] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff2a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-bold text-white">Importar XML</span>
              <span className="block text-[13px] text-surface-200 mt-0.5">iTunes / Apple Music</span>
            </span>
          </button>

          <button
            onClick={importCSV}
            className="group flex items-center gap-4 p-5 rounded-[20px] bg-surface-700 border border-surface-500 text-left cursor-pointer transition-all duration-150 hover:border-info-500/50 hover:bg-surface-600"
          >
            <span className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-[#1c1230] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a46bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-bold text-white">Importar CSV</span>
              <span className="block text-[13px] text-surface-200 mt-0.5">Spotify (Exportify)</span>
            </span>
          </button>
        </div>

        <div className="w-full mt-4 p-6 rounded-[20px] bg-surface-800 border border-surface-500/60 text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-surface-300 mb-[18px]">¿Primera vez?</div>
          <div className="grid grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="w-7 h-7 rounded-full bg-[#2a0d08] text-accent-400 text-[13px] font-bold flex items-center justify-center">{i + 1}</div>
                <div className="text-sm font-bold text-white mt-3 mb-1.5">{step.title}</div>
                <div className="text-[13px] leading-relaxed text-surface-200">
                  {step.text ?? (
                    <>
                      Usa{' '}
                      <a href="https://exportify.net" className="text-accent-400 hover:text-accent-300 underline underline-offset-2" target="_blank" rel="noreferrer">
                        Exportify
                      </a>{' '}
                      para guardar tus playlists en CSV.
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
