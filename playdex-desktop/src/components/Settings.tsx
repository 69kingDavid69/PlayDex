import { useState } from 'react'
import useDownloadStore from '../store/downloadStore'

type SettingsTab = 'general' | 'calidad' | 'deezer'

export default function Settings() {
  const {
    settingsOpen,
    closeSettings,
    downloadPath,
    setDownloadPath,
    browseDownloadPath,
    preferredFormat,
    setPreferredFormat,
    allowFallback,
    setAllowFallback,
    rejectBelow320,
    setRejectBelow320,
    arlToken,
    setArlToken,
    saveSettings
  } = useDownloadStore()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  if (!settingsOpen) return null

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeSettings}>
      <div 
        className="modal-content animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-bold text-white">Ajustes</h2>
          <button 
            onClick={closeSettings} 
            className="p-1.5 rounded-lg text-surface-300 hover:text-white hover:bg-surface-600 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="px-6 pb-4">
          <div className="tab-bar">
            <button 
              className={`tab-item ${activeTab === 'general' ? 'tab-item-active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button 
              className={`tab-item ${activeTab === 'calidad' ? 'tab-item-active' : ''}`}
              onClick={() => setActiveTab('calidad')}
            >
              Calidad
            </button>
            <button 
              className={`tab-item ${activeTab === 'deezer' ? 'tab-item-active' : ''}`}
              onClick={() => setActiveTab('deezer')}
            >
              Deezer
            </button>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="px-6 pb-6 min-h-[260px]">
          {activeTab === 'general' && <GeneralTab 
            downloadPath={downloadPath} 
            setDownloadPath={setDownloadPath}
            browseDownloadPath={browseDownloadPath}
          />}
          {activeTab === 'calidad' && <CalidadTab 
            preferredFormat={preferredFormat}
            setPreferredFormat={setPreferredFormat}
            allowFallback={allowFallback}
            setAllowFallback={setAllowFallback}
            rejectBelow320={rejectBelow320}
            setRejectBelow320={setRejectBelow320}
          />}
          {activeTab === 'deezer' && <DeezerTab 
            arlToken={arlToken}
            setArlToken={setArlToken}
          />}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-700">
          <button onClick={closeSettings} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={saveSettings} className="btn-primary">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function GeneralTab({ downloadPath, setDownloadPath, browseDownloadPath }: {
  downloadPath: string
  setDownloadPath: (path: string) => void
  browseDownloadPath: () => void
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <label className="block text-sm font-medium text-surface-100 mb-2">
          Carpeta de descargas
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={downloadPath}
            onChange={e => setDownloadPath(e.target.value)}
            className="input-field flex-1"
            placeholder="~/Music/PlayDex"
          />
          <button onClick={browseDownloadPath} className="btn-secondary whitespace-nowrap">
            Examinar
          </button>
        </div>
        <p className="text-[11px] text-surface-300 mt-1.5">
          Las canciones se guardarán en subcarpetas por playlist.
        </p>
      </div>
    </div>
  )
}

function CalidadTab({ preferredFormat, setPreferredFormat, allowFallback, setAllowFallback, rejectBelow320, setRejectBelow320 }: {
  preferredFormat: 'FLAC' | 'MP3_320'
  setPreferredFormat: (f: 'FLAC' | 'MP3_320') => void
  allowFallback: boolean
  setAllowFallback: (v: boolean) => void
  rejectBelow320: boolean
  setRejectBelow320: (v: boolean) => void
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <label className="block text-sm font-medium text-surface-100 mb-2">
          Formato de audio preferido
        </label>
        <select 
          value={preferredFormat}
          onChange={e => setPreferredFormat(e.target.value as 'FLAC' | 'MP3_320')}
          className="select-field"
        >
          <option value="FLAC">FLAC (lossless)</option>
          <option value="MP3_320">MP3 320 kbps</option>
        </select>
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={allowFallback} 
            onChange={e => setAllowFallback(e.target.checked)}
            className="checkbox-custom"
          />
          <div>
            <span className="text-sm text-surface-100 group-hover:text-white transition-colors">
              Permitir fallback a calidad inferior
            </span>
            <p className="text-[11px] text-surface-400 mt-0.5">
              Si FLAC no está disponible, usar MP3 320
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={rejectBelow320} 
            onChange={e => setRejectBelow320(e.target.checked)}
            className="checkbox-custom"
          />
          <div>
            <span className="text-sm text-surface-100 group-hover:text-white transition-colors">
              Rechazar por debajo de 320 kbps
            </span>
            <p className="text-[11px] text-surface-400 mt-0.5">
              No descargar tracks con calidad inferior
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}

function DeezerTab({ arlToken, setArlToken }: {
  arlToken: string
  setArlToken: (token: string) => void
}) {
  const trimmed = arlToken.trim()
  const isEmpty = trimmed.length === 0
  const isTooShort = !isEmpty && trimmed.length < 20
  const isValid = !isEmpty && !isTooShort

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <label className="block text-sm font-medium text-surface-100 mb-2">
          Token ARL de Deezer
        </label>
        <input
          type="password"
          value={arlToken}
          onChange={e => setArlToken(e.target.value)}
          className="input-field"
          placeholder="Pega tu cookie ARL aquí"
        />

        {/* Status indicator */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isEmpty ? 'bg-surface-400' : isTooShort ? 'bg-warning-500' : 'bg-success-500'}`} />
          <span className={`text-xs ${isEmpty ? 'text-surface-400' : isTooShort ? 'text-warning-500' : 'text-success-400'}`}>
            {isEmpty && 'Pega aquí la cookie arl de tu sesión activa de Deezer'}
            {isTooShort && 'El ARL parece demasiado corto. Revisa que hayas copiado la cookie completa.'}
            {isValid && 'ARL guardado. La próxima descarga usará tu sesión actual.'}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-surface-700/50 border border-surface-600/50">
        <p className="text-xs text-surface-300 leading-relaxed">
          💡 El token ARL se persiste de forma segura. El bridge Python lo recibe por variable de entorno.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-accent-500/8 border border-accent-500/15">
        <p className="text-xs text-accent-300 leading-relaxed">
          <strong>¿Cómo obtener el ARL?</strong><br />
          1. Inicia sesión en <span className="font-mono">deezer.com</span><br />
          2. Abre DevTools (F12) → Application → Cookies<br />
          3. Copia el valor de la cookie <span className="font-mono">arl</span>
        </p>
      </div>
    </div>
  )
}