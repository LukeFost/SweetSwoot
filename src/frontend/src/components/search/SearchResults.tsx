import React from 'react';
import { useSearch } from '../../context/SearchContext';
import { VideoPlayer } from '../../video-service';
// Define Tag type locally
type Tag = string;

export const SearchResults: React.FC = () => {
  const { searchResults, isSearching, searchQuery } = useSearch();
  
  if (isSearching) {
    return <div className="p-4 text-center">Searching...</div>;
  }
  
  if (searchQuery && searchResults.length === 0) {
    return <div className="p-4 text-center">No videos found matching "{searchQuery}"</div>;
  }
  
  if (!searchQuery || searchResults.length === 0) {
    return null;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Search Results for "{searchQuery}"</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {searchResults.map((video) => (
          <div key={video.video_id} className="border rounded-lg overflow-hidden">
            <VideoPlayer 
              videoId={video.video_id}
              src={`https://livepeercdn.studio/hls/${video.video_id}/index.m3u8`}
            />
            <div className="p-3">
              <h3 className="font-semibold">{video.title}</h3>
              <div className="flex flex-wrap gap-1 mt-2">
                {video.tags.map((tag: Tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};