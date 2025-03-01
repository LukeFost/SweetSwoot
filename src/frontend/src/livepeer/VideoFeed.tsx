import { useState, useEffect } from 'react';
import { useActor } from '../ic/Actors';
import { VideoPlayer } from './VideoPlayer';
import type { VideoMetadata } from '../../../backend/declarations/backend.did';
import { BackendExtended } from './types';

interface VideoFeedProps {
  tag?: string;
  className?: string;
  onVideoSelect?: (videoId: string) => void;
}

export function VideoFeed({ tag, className = '', onVideoSelect }: VideoFeedProps) {
  const actor = useActor();
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  
  // Load videos based on tag or all videos
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const fetchVideos = async () => {
      if (!actor) return;
      
      try {
        let videoList: VideoMetadata[];
        // Cast the actor to our extended type
        const backendActor = actor as unknown as BackendExtended;
        
        if (tag) {
          videoList = await backendActor.list_videos_by_tag(tag);
        } else {
          // Get videos from the backend actor
          videoList = await actor.list_all_videos();
          console.log("Loaded videos:", videoList);
        }
        
        // Sort videos by timestamp (newest first)
        videoList.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        
        setVideos(videoList);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos: ' + (err instanceof Error ? err.message : String(err)));
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [actor, tag]);
  
  // Handle video scroll
  const handleNextVideo = () => {
    if (activeVideoIndex < videos.length - 1) {
      setActiveVideoIndex(activeVideoIndex + 1);
    }
  };
  
  const handlePrevVideo = () => {
    if (activeVideoIndex > 0) {
      setActiveVideoIndex(activeVideoIndex - 1);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-zinc-700 mb-4"></div>
          <div className="h-4 w-40 bg-zinc-700 rounded-md mb-2"></div>
          <div className="h-3 w-24 bg-zinc-700 rounded-md"></div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className={`bg-red-500 bg-opacity-20 text-red-100 p-6 rounded-lg ${className}`}>
        <h3 className="text-lg font-medium mb-2">Error Loading Videos</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  // Show empty state
  if (videos.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full bg-zinc-800 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <h3 className="text-xl font-medium mb-2">No Videos Found</h3>
          <p className="text-zinc-400">
            {tag 
              ? `No videos found with the tag "${tag}"`
              : 'No videos have been uploaded yet'
            }
          </p>
        </div>
      </div>
    );
  }
  
  // Show video feed
  const activeVideo = videos[activeVideoIndex];
  
  return (
    <div className={`relative h-full ${className}`}>
      {/* Current Video */}
      <div className="h-full">
        <VideoPlayer 
          videoId={activeVideo.video_id} 
          autoPlay={true}
          loop={false}
          onCompletion={handleNextVideo}
          className="h-full"
        />
        
        {/* Video Info Overlay */}
        <div className="absolute bottom-16 left-4 right-4 p-4 z-10">
          <h3 className="text-xl font-medium mb-1 text-white drop-shadow-md">
            {activeVideo.title}
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {activeVideo.tags.map((tag, index) => (
              <span 
                key={index} 
                className="text-xs bg-white/20 rounded-full px-2 py-1 text-white"
              >
                #{tag}
              </span>
            ))}
          </div>
          
          {/* View Details Button */}
          {onVideoSelect && (
            <button
              onClick={() => onVideoSelect(activeVideo.video_id)}
              className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation Controls */}
      <div className="absolute top-0 bottom-0 left-0 w-1/3 flex items-center justify-start opacity-0 hover:opacity-100 transition-opacity">
        {activeVideoIndex > 0 && (
          <button 
            onClick={handlePrevVideo}
            className="p-4 ml-2 bg-black/30 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="absolute top-0 bottom-0 right-0 w-1/3 flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity">
        {activeVideoIndex < videos.length - 1 && (
          <button 
            onClick={handleNextVideo}
            className="p-4 mr-2 bg-black/30 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Video Progress Indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-4">
        {videos.map((_, index) => (
          <div 
            key={index}
            className={`h-1 flex-grow rounded-full ${
              index === activeVideoIndex 
                ? 'bg-white' 
                : index < activeVideoIndex 
                  ? 'bg-white/60' 
                  : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}