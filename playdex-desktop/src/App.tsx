import { useEffect } from 'react'
import PlaylistSidebar from './components/PlaylistSidebar'
import TrackList from './components/TrackList'
import DownloadQueue from './components/DownloadQueue'
import Settings from './components/Settings'
import EmptyState from './components/EmptyState'
import useDownloadStore from './store/downloadStore'

function App() {
  const { bootstrapIfNeeded, playlists } = useDownloadStore()

  useEffect(() => {
    bootstrapIfNeeded()
  }, [])

  const hasPlaylists = playlists.length > 0

  return (
    <div className="flex h-screen bg-gray-50">
      <PlaylistSidebar />
      <main className="flex-1 overflow-auto">
        {hasPlaylists ? (
          <>
            <TrackList />
            <DownloadQueue />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
      <Settings />
    </div>
  )
}

export default App