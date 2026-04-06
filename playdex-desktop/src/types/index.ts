// Equivalente de AudioFormat.swift
export type AudioFormat = 'FLAC' | 'MP3_320'

// Equivalente de PlaylistSource
export type PlaylistSource = 'xmlLibrary' | 'csvLibrary' | 'musicKit'

// Equivalente de Track.swift
export interface Track {
  id: string
  artist: string
  title: string
  album?: string
  isrc?: string
  durationSeconds?: number
}

// Equivalente de Playlist.swift
export interface Playlist {
  id: string
  name: string
  tracks: Track[]
  source: PlaylistSource
}

// Equivalente de DownloadState
export type DownloadState = 'pending' | 'downloading' | 'completed' | 'skipped' | 'error' | 'paused' | 'cancelled'

// Equivalente de DownloadJob.swift
export interface DownloadJob {
  id: string
  playlistName: string
  track: Track
  status: DownloadState
  audioFormat?: AudioFormat
  progressPercent: number
  speedKbps?: number
  etaSeconds?: number
  filePath?: string
  fileSizeMB?: number
  message?: string
  existingPlaylist?: string
}