export interface EngineTrackDescriptor {
  artist: string
  title: string
}

export interface PlaylistStats {
  completed: number
  skipped: number
  errors: number
}

export type EngineEvent =
  | {
      event: 'bridge_ready'
      deemix_available: boolean
      download_ready: boolean
      arl_present: boolean
    }
  | {
      event: 'progress'
      track: EngineTrackDescriptor
      percent: number
      speed_kbps?: number
      eta_seconds?: number
    }
  | {
      event: 'completed'
      track: EngineTrackDescriptor
      file_path: string
      audio_format: string
      file_size_mb?: number
    }
  | {
      event: 'skipped'
      track: EngineTrackDescriptor
      reason: string
      existing_file: string
      existing_playlist: string
    }
  | {
      event: 'error'
      track?: EngineTrackDescriptor
      error_code: string
      message: string
    }
  | {
      event: 'playlist_done'
      playlist: string
      stats: PlaylistStats
    }
  | {
      event: 'bridge_error'
      error_code: string
      message: string
    }