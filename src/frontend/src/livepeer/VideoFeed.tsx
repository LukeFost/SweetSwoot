import { useState, useEffect, useRef } from 'react';
import { useActor } from '../ic/Actors';
import { VideoPlayer } from './VideoPlayer';
import type { VideoMetadata } from '../../../backend/declarations/backend.did';
// BackendExtended no longer needed with our proxy

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
  
  // Create a stable function for fetching videos
  const fetchVideos = async () => {
    if (!actor) {
      console.log("No actor available in VideoFeed, setting loading to false");
      setLoading(false);
      return;
    }
    
    try {
      let videoList: VideoMetadata[];
      
      // Modified tag handling to use list_all_videos for undefined or "All" tag
      if (tag && tag !== "all" && tag !== "All") {
        try {
          console.log('Searching videos by tag in VideoFeed:', tag);
          // @ts-ignore - Our proxy handles this correctly
          videoList = await actor.list_videos_by_tag(tag.toLowerCase());
          console.log(`Found ${videoList.length} videos with tag in VideoFeed: ${tag}`);
        } catch (err) {
          console.error(`Error searching for videos with tag ${tag} in VideoFeed:`, err);
          videoList = [];
        }
      } else {
        // Try using the properly fixed actor methods for all videos
        try {
          console.log('Getting all videos in VideoFeed (tag is undefined or "All")');
          // Make sure we call the method correctly
          console.log("About to call list_all_videos");
          // @ts-ignore - we know this exists from the backend.did file
          if (actor.actor && typeof actor.actor.list_all_videos === 'function') {
            console.log("Using actor.actor.list_all_videos directly");
            // @ts-ignore - we know this exists
            videoList = await actor.actor.list_all_videos();
          } // @ts-ignore - we know this exists
          else if (typeof actor.list_all_videos === 'function') {
            console.log("Using actor.list_all_videos directly");
            // @ts-ignore - we know this exists 
            videoList = await actor.list_all_videos();
          } else {
            console.error("list_all_videos method not found on actor");
            videoList = [];
          }
          console.log("Successfully loaded videos in VideoFeed:", videoList);
          
          // Check if videos are properly shaped
          if (videoList && videoList.length > 0) {
            console.log("First video structure:", videoList[0]);
          }
        } catch (err) {
          console.error("Error loading videos from backend:", err);
          // Try to load videos from localStorage as a fallback during development
          try {
            const localVideos = JSON.parse(localStorage.getItem('localVideos') || '[]');
            if (localVideos.length > 0) {
              console.log("Loading videos from localStorage fallback:", localVideos);
              videoList = localVideos;
            } else {
              videoList = [];
            }
          } catch (localErr) {
            console.error("Error loading from localStorage:", localErr);
            videoList = [];
          }
        }
        console.log("Loaded videos:", videoList);
      }
      
      // Sort videos by timestamp (newest first)
      if (videoList && videoList.length > 0) {
        videoList.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      }
      
      setVideos(videoList);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos: ' + (err instanceof Error ? err.message : String(err)));
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Create a ref to track previous fetch parameters
  const prevFetchIdRef = useRef<string | null>(null);
  
  // Load videos based on tag or all videos with better actor readiness check
  useEffect(() => {
    // Check that actor is fully ready before attempting to fetch
    if (!actor || !actor.actor) {
      console.log("VideoFeed: Actor not fully ready yet, skipping fetch");
      return;
    }
    
    // Create a stable identifier for the current fetch parameters
    // Include actor.actor existence in the ID to ensure we re-fetch when it becomes available
    const actorId = actor.actor ? 'has-nested-actor' : 'no-nested-actor';
    const fetchId = `${actorId}-${tag || 'all'}`;
    
    // Only fetch if parameters have changed
    if (prevFetchIdRef.current !== fetchId) {
      console.log(`VideoFeed fetching with new parameters: ${fetchId}`);
      setLoading(true);
      setError(null);
      prevFetchIdRef.current = fetchId;
      fetchVideos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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