import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { Playlist, DownloadJob, DownloadState } from '../types'
import { EngineEvent } from '../types/engineEvents'

interface DownloadStore {
  // Estado
  playlists: Playlist[]
  selectedPlaylistId: string | null
  jobs: DownloadJob[]
  bridgeStatusText: string
  lastErrorMessage: string | null
  isPaused: boolean
  csvPlaylistUrl: string | null
  engineReady: boolean

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
}

const useDownloadStore = create<DownloadStore>((set, get) => ({
  playlists: [],
  selectedPlaylistId: null,
  jobs: [],
  bridgeStatusText: 'Inicializando...',
  lastErrorMessage: null,
  isPaused: false,
  csvPlaylistUrl: null,
  engineReady: false,

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
    return { total, completed, downloading, errors }
  },
  menuBarStatusText: () => {
    const summary = get().queueSummary()
    return `Descargando: ${summary.downloading}/${summary.total}`
  },

  bootstrapIfNeeded: async () => {
    try {
      await invoke('start_engine')
      
      // Suscribirse a eventos del engine
      await listen<EngineEvent>('engine-event', ({ payload }) => {
        get().handleEngineEvent(payload)
      })
      
      // Guardar la función para desuscribirse si es necesario
      // (podríamos guardarla en el estado si necesitamos limpiar)
    } catch (error) {
      set({ lastErrorMessage: String(error), bridgeStatusText: 'Error al iniciar engine' })
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
      if (!selected) return // usuario canceló
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
    
    // Crear jobs para cada track
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

  handleEngineEvent: (event: EngineEvent) => {
    console.log('Engine event received:', event)
    
    switch (event.event) {
      case 'bridge_ready':
        set({
          bridgeStatusText: `Engine listo - Deezer: ${event.deemix_available ? 'OK' : 'No disponible'}`,
          engineReady: event.download_ready
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
          bridgeStatusText: `Playlist "${event.playlist}" completada - ${event.stats.completed} OK, ${event.stats.skipped} saltadas, ${event.stats.errors} errores`
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