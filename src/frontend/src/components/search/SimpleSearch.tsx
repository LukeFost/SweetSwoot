import { useState, useEffect } from 'react';
import { useActor } from '../../ic/Actors';

interface VideoMetadata {
  video_id: string;
  title: string;
  uploader_principal: any;
  tags: string[];
  storage_ref: string[] | [];
  timestamp: bigint;
}

/**
 * A standalone search component that doesn't rely on context
 */
export function SimpleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const actor = useActor();

  // Perform search when query changes
  useEffect(() => {
    const search = async () => {
      if (!query || !actor) return;
      
      setIsSearching(true);
      try {
        // Cast actor to any to bypass TypeScript checking
        const backendActor = actor as any;
        
        if (typeof backendActor.search_videos === 'function') {
          const searchResults = await backendActor.search_videos(
            query,
            [20], // limit to 20 results
            [0]   // start at offset 0
          );
          setResults(searchResults);
        } else {
          console.error('search_videos function not found on actor');
          setResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      search();
    }, 500);

    return () => clearTimeout(timer);
  }, [query, actor]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search videos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
        />
      </div>

      {isSearching ? (
        <div className="py-8 text-center text-zinc-400">
          Searching...
        </div>
      ) : results.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((video) => (
              <div key={video.video_id} className="bg-zinc-800 rounded-lg overflow-hidden">
                <div className="aspect-video bg-zinc-700 flex items-center justify-center">
                  {video.storage_ref && video.storage_ref.length > 0 ? (
                    <div className="text-sm text-zinc-400 p-2">
                      Video ID: {video.video_id}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">No video reference</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-white">{video.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {video.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-zinc-700 text-xs rounded-full text-zinc-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    Uploaded: {new Date(Number(video.timestamp) * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : query ? (
        <div className="py-8 text-center text-zinc-400">
          No videos found matching "{query}"
        </div>
      ) : null}
    </div>
  );
}