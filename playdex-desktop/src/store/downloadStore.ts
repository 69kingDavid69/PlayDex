import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { Playlist, DownloadJob, DownloadState } from '../types'
import { EngineEvent } from '../types/engineEvents'

// Matches the Rust Settings struct
interface BackendSettings {
  download_location: string
  preferred_format: 'FLAC' | 'MP3_320'
  allow_fallback: boolean
  reject_below_320: boolean
  parallel_downloads: number
  retry_count: number
}

interface DownloadStore {
  // Estado
  playlists: Playlist[]
  selectedPlaylistId: string | null
  jobs: DownloadJob[]
  bridgeStatusText: string
  lastErrorMessage: string | null
  isPaused: boolean
  csvPlaylistUrl: string | null
  engineStarted: boolean
  downloadReady: boolean

  // Settings
  settingsOpen: boolean
  downloadPath: string
  preferredFormat: 'FLAC' | 'MP3_320'
  allowFallback: boolean
  rejectBelow320: boolean
  arlToken: string
  parallelDownloads: number
  retryCount: number

  // Acciones
  bootstrapIfNeeded: () => Promise<void>
  reloadPlaylists: () => Promise<void>
  importLibraryXML: () => Promise<void>
  importCSV: () => Promise<void>
  clearImportedCSV: () => void
  selectPlaylist: (id: string | null) => void
  queueSelectedPlaylist: () => void
  pauseAll: () => void
  resumeAll: () => void
  cancelAll: () => void
  handleEngineEvent: (event: EngineEvent) => void

  // Settings actions
  openSettings: () => void
  closeSettings: () => void
  setDownloadPath: (path: string) => void
  setPreferredFormat: (format: 'FLAC' | 'MP3_320') => void
  setAllowFallback: (allow: boolean) => void
  setRejectBelow320: (reject: boolean) => void
  setArlToken: (token: string) => void
  browseDownloadPath: () => Promise<void>
  saveSettings: () => Promise<void>

  // Computed (getters)
  selectedPlaylist: () => Playlist | null
  isDownloading: () => boolean
  queueSummary: () => QueueSummary
  menuBarStatusText: () => string
}

interface QueueSummary {
  total: number
  completed: number
  downloading: number
  errors: number
  pending: number
  skipped: number
}

const useDownloadStore = create<DownloadStore>((set, get) => ({
  playlists: [],
  selectedPlaylistId: null,
  jobs: [],
  bridgeStatusText: 'Inicializando...',
  lastErrorMessage: null,
  isPaused: false,
  csvPlaylistUrl: null,
  engineStarted: false,
  downloadReady: false,

  // Settings state
  settingsOpen: false,
  downloadPath: '~/Music/PlayDex',
  preferredFormat: 'FLAC',
  allowFallback: true,
  rejectBelow320: false,
  arlToken: '',
  parallelDownloads: 3,
  retryCount: 2,

  selectedPlaylist: () => {
    const state = get()
    return state.playlists.find(p => p.id === state.selectedPlaylistId) || state.playlists[0] || null
  },
  isDownloading: () => {
    const state = get()
    return state.jobs.some(j => j.status === 'downloading')
  },
  queueSummary: () => {
    const state = get()
    const total = state.jobs.length
    const completed = state.jobs.filter(j => j.status === 'completed').length
    const downloading = state.jobs.filter(j => j.status === 'downloading').length
    const errors = state.jobs.filter(j => j.status === 'error').length
    const pending = state.jobs.filter(j => j.status === 'pending').length
    const skipped = state.jobs.filter(j => j.status === 'skipped').length
    return { total, completed, downloading, errors, pending, skipped }
  },
  menuBarStatusText: () => {
    const summary = get().queueSummary()
    return `Descargando: ${summary.downloading}/${summary.total}`
  },

  bootstrapIfNeeded: async () => {
    try {
      // Load saved settings from Rust backend
      try {
        const settings = await invoke<BackendSettings>('get_settings')
        if (settings) {
          set({
            downloadPath: settings.download_location || '~/Music/PlayDex',
            preferredFormat: settings.preferred_format || 'FLAC',
            allowFallback: settings.allow_fallback ?? true,
            rejectBelow320: settings.reject_below_320 ?? false,
            parallelDownloads: settings.parallel_downloads ?? 3,
            retryCount: settings.retry_count ?? 2,
          })
        }
      } catch (e) {
        console.warn('Could not load settings:', e)
      }

      // Load ARL token from keyring
      try {
        const arl = await invoke<string>('get_arl')
        if (arl) {
          set({ arlToken: arl })
        }
      } catch (e) {
        console.warn('Could not load ARL:', e)
      }

      // Subscribe to engine events BEFORE invoking start_engine
      await listen<EngineEvent>('engine-event', ({ payload }) => {
        get().handleEngineEvent(payload)
      })

      try {
        await invoke('start_engine')
      } catch (error) {
        set({ 
          lastErrorMessage: String(error) || 'Error desconocido al invocar engine', 
          bridgeStatusText: 'Error en arranque del engine' 
        })
      }
    } catch (error: NodeJS.ErrnoException | any) {
      set({ 
        lastErrorMessage: (error && error.message) ? error.message : String(error), 
        bridgeStatusText: 'Error general en inicio' 
      })
    }
  },

  reloadPlaylists: async () => {
    // TODO: cargar playlists desde almacenamiento local
  },

  importLibraryXML: async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'XML de iTunes/Music', extensions: ['xml'] }],
        title: 'Seleccionar archivo XML de librería'
      })
      if (!selected) return
      const playlists = await invoke<Playlist[]>('import_xml', { customPath: selected })
      set((state) => ({ playlists: [...state.playlists, ...playlists] }))
    } catch (error) {
      set({ lastErrorMessage: String(error) })
    }
  },

  importCSV: async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV de Spotify', extensions: ['csv', 'txt'] }],
        title: 'Seleccionar archivo CSV de Spotify'
      })
      if (!selected) return
      const playlist = await invoke<Playlist>('import_csv', { path: selected })
      set((state) => ({ playlists: [...state.playlists, playlist] }))
    } catch (error) {
      set({ lastErrorMessage: String(error) })
    }
  },

  clearImportedCSV: () => {
    set({ csvPlaylistUrl: null })
  },

  selectPlaylist: (id: string | null) => {
    set({ selectedPlaylistId: id })
  },

  queueSelectedPlaylist: () => {
    const state = get()
    const selectedPlaylist = state.playlists.find(p => p.id === state.selectedPlaylistId) || state.playlists[0]
    if (!selectedPlaylist) return
    
    const jobs: DownloadJob[] = selectedPlaylist.tracks.map(track => ({
      id: crypto.randomUUID(),
      playlistName: selectedPlaylist.name,
      track: { ...track },
      status: 'pending' as DownloadState,
      audioFormat: undefined,
      progressPercent: 0,
      speedKbps: undefined,
      etaSeconds: undefined,
      filePath: undefined,
      fileSizeMB: undefined,
      message: undefined,
      existingPlaylist: undefined
    }))
    
    set({ jobs })
    
    invoke('download_playlist', { playlist: selectedPlaylist })
      .catch(error => {
        set({ lastErrorMessage: String(error) })
      })
  },

  pauseAll: () => {
    invoke('pause_download').catch(console.error)
    set({ isPaused: true })
  },

  resumeAll: () => {
    invoke('resume_download').catch(console.error)
    set({ isPaused: false })
  },

  cancelAll: () => {
    invoke('cancel_download').catch(console.error)
    set({ jobs: [] })
  },

  // Settings actions
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setDownloadPath: (path: string) => set({ downloadPath: path }),
  setPreferredFormat: (format: 'FLAC' | 'MP3_320') => set({ preferredFormat: format }),
  setAllowFallback: (allow: boolean) => set({ allowFallback: allow }),
  setRejectBelow320: (reject: boolean) => set({ rejectBelow320: reject }),
  setArlToken: (token: string) => set({ arlToken: token }),
  
  browseDownloadPath: async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta de descargas'
      })
      if (selected) {
        set({ downloadPath: selected as string })
      }
    } catch (error) {
      console.error('Error selecting directory:', error)
    }
  },

  saveSettings: async () => {
    const state = get()
    
    // Save settings to Rust backend
    try {
      const backendSettings: BackendSettings = {
        download_location: state.downloadPath,
        preferred_format: state.preferredFormat,
        allow_fallback: state.allowFallback,
        reject_below_320: state.rejectBelow320,
        parallel_downloads: state.parallelDownloads,
        retry_count: state.retryCount,
      }
      await invoke('save_settings', { settings: backendSettings })
    } catch (e) {
      console.warn('Could not save settings to backend:', e)
    }
    
    // Save ARL to keyring
    try {
      await invoke('save_arl', { arl: state.arlToken })
    } catch (e) {
      console.warn('Could not save ARL:', e)
    }
    
    set({ settingsOpen: false })
  },

  handleEngineEvent: (event: EngineEvent) => {
    console.log('Engine event received:', event)
    
    switch (event.event) {
      case 'bridge_ready':
        set({
          bridgeStatusText: event.download_ready
            ? `Engine listo – Deezer: ${event.deemix_available ? 'OK' : 'No disponible'}`
            : 'Engine iniciado, falta ARL para descargar',
          engineStarted: true,
          downloadReady: event.download_ready
        })
        break
        
      case 'progress':
        set(state => ({
          jobs: state.jobs.map(job => {
            if (job.track.artist === event.track.artist && job.track.title === event.track.title) {
              return {
                ...job,
                status: 'downloading' as DownloadState,
                progressPercent: event.percent,
                speedKbps: event.speed_kbps,
                etaSeconds: event.eta_seconds
              }
            }
            return job
          })
        }))
        break
        
      case 'completed':
        set(state => ({
          jobs: state.jobs.map(job => {
            if (job.track.artist === event.track.artist && job.track.title === event.track.title) {
              return {
                ...job,
                status: 'completed' as DownloadState,
                progressPercent: 100,
                audioFormat: event.audio_format === 'FLAC' ? 'FLAC' : 'MP3_320',
                filePath: event.file_path,
                fileSizeMB: event.file_size_mb
              }
            }
            return job
          })
        }))
        break
        
      case 'skipped':
        set(state => ({
          jobs: state.jobs.map(job => {
            if (job.track.artist === event.track.artist && job.track.title === event.track.title) {
              return {
                ...job,
                status: 'skipped' as DownloadState,
                message: `Ya existe en: ${event.existing_playlist}`,
                existingPlaylist: event.existing_playlist
              }
            }
            return job
          })
        }))
        break
        
      case 'error':
        set(state => ({
          jobs: state.jobs.map(job => {
            if (event.track && job.track.artist === event.track.artist && job.track.title === event.track.title) {
              return {
                ...job,
                status: 'error' as DownloadState,
                message: event.message
              }
            }
            return job
          }),
          lastErrorMessage: event.message
        }))
        break
        
      case 'playlist_done':
        set({
          bridgeStatusText: `Playlist "${event.playlist}" completada – ${event.stats.completed} OK, ${event.stats.skipped} saltadas, ${event.stats.errors} errores`
        })
        break
        
      case 'bridge_error':
        set({
          lastErrorMessage: event.message,
          bridgeStatusText: 'Error en el engine'
        })
        break
    }
  }
}))

export default useDownloadStore