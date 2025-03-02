import { useState, useEffect, useRef } from 'react';
import { useActor } from '../ic/Actors';
import { Principal } from '@dfinity/principal';
import { HLSVideoPlayer } from './HLSVideoPlayer';
import { useVideoService } from './VideoServiceProvider';

interface VideoFeedProps {
  tag?: string;
  className?: string;
  onVideoSelect?: (videoId: string) => void;
}

export function VideoFeed({ tag, className = '', onVideoSelect }: VideoFeedProps) {
  const actor = useActor();
  const { getVideoUrl } = useVideoService();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Function to load more videos
  const loadMoreVideos = async () => {
    if (loadingMore || !hasMore || !actor) return;
    
    setLoadingMore(true);
    
    try {
      console.log('Loading videos - page:', page);
      
      // Create a stable array to hold our videos
      let fetchedVideos: any[] = [];
      
      try {
        if (tag && tag !== "all" && tag !== "All") {
          console.log(`Getting videos with tag: "${tag}"`);
          
          try {
            console.log('Using backend list_videos_by_tag method');
            // @ts-ignore - Backend API method
            const response = await actor.list_videos_by_tag(tag.toLowerCase());
            fetchedVideos = response || [];
            console.log(`Found ${fetchedVideos.length} videos with tag "${tag}" via backend`);
          } catch (err) {
            console.error('Error with backend list_videos_by_tag call:', err);
            fetchedVideos = [];
          }
        } 
        else {
          // Get all videos without tag filtering
          console.log('Getting all videos');
          
          // Try search_videos method as a fallback
          try {
            console.log('Using search_videos with empty query to get all videos');
            // @ts-ignore - Backend API method
            if (actor.search_videos && typeof actor.search_videos === 'function') {
              // @ts-ignore - Backend API method
              fetchedVideos = await actor.search_videos("", [], []);
              console.log(`Found ${fetchedVideos.length} videos via search_videos`);
            } 
            else {
              console.warn('No search_videos method found, using placeholder videos');
              fetchedVideos = createPlaceholderVideos();
            }
          } catch (searchErr) {
            console.error('Error using search_videos:', searchErr);
            console.warn('Search error, using placeholder videos');
            fetchedVideos = createPlaceholderVideos();
          }
        }
      } catch (apiErr) {
        console.error('API fetch error:', apiErr);
        // In case of API error, try localStorage as last resort for development
        try {
          console.log('Falling back to localStorage for development');
          const localData = localStorage.getItem('localVideos');
          if (localData) {
            const localVideos = JSON.parse(localData);
            if (tag && tag !== "all" && tag !== "All") {
              fetchedVideos = localVideos.filter((v: any) => 
                v.tags && v.tags.some((t: string) => 
                  t.toLowerCase() === tag.toLowerCase()
                )
              );
            } else {
              fetchedVideos = localVideos;
            }
            console.log(`Found ${fetchedVideos.length} videos in localStorage`);
          }
        } catch (localErr) {
          console.error('Error loading from localStorage:', localErr);
        }
        
        // If we still have no videos, use placeholders
        if (!fetchedVideos || fetchedVideos.length === 0) {
          console.log('All attempts to get videos failed, using placeholder videos');
          fetchedVideos = createPlaceholderVideos();
            
          // If we have tag filtering, apply it to the placeholder videos
          if (tag && tag !== "all" && tag !== "All") {
            fetchedVideos = fetchedVideos.filter((v: any) => 
              v.tags && v.tags.some((t: string) => 
                t.toLowerCase() === tag.toLowerCase()
              )
            );
          }
        }
      }
      
      // Ensure we have a valid array before sorting
      if (!Array.isArray(fetchedVideos)) {
        console.warn('fetchedVideos is not an array, using empty array instead');
        fetchedVideos = [];
      }
      
      // Sort videos by timestamp
      console.log('About to sort videos, normalizedVideos:', fetchedVideos);
      let sortedVideos: any[] = [];
      try {
        // Defensive copy to avoid mutation
        sortedVideos = Array.isArray(fetchedVideos) ? [...fetchedVideos] : [];
        console.log('Created sorted videos array with length:', sortedVideos.length);
        
        if (sortedVideos.length > 0) {
          console.log('First video before sorting:', sortedVideos[0]);
          
          // Define a safe sort function
          sortedVideos.sort((a, b) => {
            // Safe timestamp extraction with defaults
            const getTimestamp = (video: any): number => {
              if (!video) return 0;
              
              const timestamp = video.timestamp || 0;
                               
              return typeof timestamp === 'bigint' ? 
                Number(timestamp) : 
                typeof timestamp === 'number' ? 
                  timestamp : 0;
            };
            
            // Get timestamps with error handling
            try {
              const timestampA = getTimestamp(a);
              const timestampB = getTimestamp(b);
              console.log(`Comparing timestamps: A=${timestampA}, B=${timestampB}`);
              return timestampB - timestampA; // Newest first
            } catch (err) {
              console.error('Error comparing timestamps:', err, 'for videos:', a, b);
              return 0;
            }
          });
          console.log('Sorting complete, first video after sorting:', sortedVideos[0]);
        }
      } catch (sortError) {
        console.error('Critical error during sorting:', sortError);
        // Fall back to unsorted array 
        sortedVideos = Array.isArray(fetchedVideos) ? [...fetchedVideos] : [];
      }
      
      console.log('Sorted videos:', sortedVideos);
      
      // Simulate pagination - in a real implementation we would fetch only the videos for the current page
      const ITEMS_PER_PAGE = 5;
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = page * ITEMS_PER_PAGE;
      const newPageVideos = sortedVideos.slice(startIndex, endIndex);
      
      console.log(`Page ${page}: Sliced videos from ${startIndex} to ${endIndex}`, newPageVideos);
      
      // Check if we have more videos to load
      setHasMore(endIndex < sortedVideos.length);
      
      // If this is the first page, replace the videos array
      // Otherwise append to the existing videos
      if (page === 1) {
        setVideos(newPageVideos);
      } else {
        setVideos(prev => [...prev, ...newPageVideos]);
      }
      
      // Increment the page number for the next load
      setPage(prevPage => prevPage + 1);
    } catch (err) {
      console.error('Error loading more videos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Create a stable function for fetching initial videos
  const fetchVideos = async () => {
    if (!actor) {
      console.log("No actor available in VideoFeed, setting loading to false");
      setLoading(false);
      return;
    }
    
    try {
      // Reset pagination state
      setPage(1);
      setHasMore(true);
      
      // Load first page of videos
      await loadMoreVideos();
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
  
  // Create placeholders for testing purposes when no videos are found
  const createPlaceholderVideos = () => {
    console.log("Creating placeholder videos for testing");
        
    // Sample videos with IPFS references
    return [
      {
        video_id: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        title: "Sample Video 1",
        tags: ["sample", "test"],
        storage_ref: ["ipfs:QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"] as [] | [string],
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        uploader_principal: Principal.fromText("aaaaa-aa")
      },
      {
        video_id: "QmSZCk5C3dKWmJPJ1TAcC4TW3NVuAZnzJm2kTU7bSDmCFN",
        title: "Sample Video 2",
        tags: ["sample", "demo"],
        storage_ref: ["ipfs:QmSZCk5C3dKWmJPJ1TAcC4TW3NVuAZnzJm2kTU7bSDmCFN"] as [] | [string],
        timestamp: BigInt(Math.floor(Date.now() / 1000 - 100)),
        uploader_principal: Principal.fromText("aaaaa-aa")
      },
      {
        video_id: "QmTKZgRBuxLJfq9Tz8uNGxi2JKjMkZUsxMsAFGAtepvYZb",
        title: "Sample Video 3",
        tags: ["sample", "demo"],
        storage_ref: ["ipfs:QmTKZgRBuxLJfq9Tz8uNGxi2JKjMkZUsxMsAFGAtepvYZb"] as [] | [string],
        timestamp: BigInt(Math.floor(Date.now() / 1000 - 200)),
        uploader_principal: Principal.fromText("aaaaa-aa")
      }
    ];
  };

  // Load videos based on tag or all videos with better actor readiness check
  useEffect(() => {
    // Check that actor is fully ready before attempting to fetch
    // Safely check if actor exists first
    if (!actor) {
      console.log("VideoFeed: Actor not available yet, skipping fetch");
      return;
    }
    
    // Create a stable identifier for the current fetch parameters
    // Use a safer method to check for nested actor without direct property access
    const hasNestedActor = actor && typeof actor === 'object' && 'actor' in actor;
    const actorId = hasNestedActor ? 'has-nested-actor-all' : 'no-nested-actor-all';
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
  
  // Add effect to handle error fallback
  useEffect(() => {
    if (error) {
      console.log("Error detected, using placeholder videos");
      setVideos(createPlaceholderVideos());
      setError(null);
    }
  }, [error]);

  // Add effect to handle empty videos fallback
  useEffect(() => {
    if (!loading && videos.length === 0 && !error) {
      console.log("No videos found, using placeholder videos");
      setVideos(createPlaceholderVideos());
    }
  }, [loading, videos.length, error]);

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
  
  // Show empty state spinner while waiting for placeholder videos to be set by the effect
  if (videos.length === 0) {
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
  
  
  // New logic for scroll-based video playback and infinite loading
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [visibleVideoIndex, setVisibleVideoIndex] = useState<number>(0);
  
  // Set up intersection observer for videos (playback)
  useEffect(() => {
    if (!videos.length) return;
    
    // Reset refs array to match videos length
    videoRefs.current = videoRefs.current.slice(0, videos.length);
    
    const options = {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.6, // when 60% of the element is visible
    };
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        // Find the index of this video in our videos array
        const index = videoRefs.current.findIndex(ref => ref === entry.target);
        
        // If we found the element and it's intersecting
        if (index !== -1 && entry.isIntersecting) {
          console.log(`Video ${index} is now visible`);
          setVisibleVideoIndex(index);
          
          // Find the video element in this container and play it
          const videoElement = entry.target.querySelector('video');
          if (videoElement) {
            videoElement.play().catch(err => console.log('Autoplay prevented:', err));
          }
        } else if (index !== -1) {
          // Find the video element in this container and pause it
          const videoElement = entry.target.querySelector('video');
          if (videoElement) {
            videoElement.pause();
          }
        }
      });
    };
    
    const observer = new IntersectionObserver(handleIntersection, options);
    
    // Observe all video elements
    videoRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    
    return () => {
      // Clean up
      observer.disconnect();
    };
  }, [videos.length]);
  
  // Set up intersection observer for infinite loading
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    
    const options = {
      root: null,
      rootMargin: '100px', // Load more when we're 100px from the bottom
      threshold: 0.1,
    };
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        console.log('Loading more videos...');
        loadMoreVideos();
      }
    };
    
    const observer = new IntersectionObserver(handleIntersection, options);
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, page]);

  // Get video URL from storage_ref
  const getVideoSrc = (video: any) => {
    if (!video || !video.storage_ref) return '';
    
    const storageRef = Array.isArray(video.storage_ref) 
      ? video.storage_ref[0] 
      : video.storage_ref;
    
    if (!storageRef) return '';
    
    // Handle different storage reference formats
    if (storageRef.startsWith('ipfs:')) {
      const cid = storageRef.substring(5);
      return getVideoUrl(cid);
    }
    
    return storageRef;
  };
  
  return (
    <div 
      ref={containerRef}
      className={`relative h-full overflow-y-auto snap-y snap-mandatory ${className}`}
      style={{ maxHeight: '100vh' }}
    >
      {/* Render all videos in a vertical scroll */}
      {videos.map((video, index) => (
        <div 
          key={video.video_id}
          ref={el => videoRefs.current[index] = el}
          className="h-full w-full snap-start snap-always relative"
          style={{ minHeight: '100vh' }}
        >
          {/* Video Player */}
          <HLSVideoPlayer 
            src={getVideoSrc(video)} 
            autoPlay={index === visibleVideoIndex}
            loop={true}
            className="h-full w-full object-cover"
          />
          
          {/* Video Info Overlay */}
          <div className="absolute bottom-16 left-4 right-4 p-4 z-10">
            <h3 className="text-xl font-medium mb-1 text-white drop-shadow-md">
              {video.title}
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {video.tags && video.tags.map((tag: string, i: number) => (
                <span 
                  key={i} 
                  className="text-xs bg-white/20 rounded-full px-2 py-1 text-white"
                >
                  #{tag}
                </span>
              ))}
            </div>
            
            {/* View Details Button */}
            {onVideoSelect && (
              <button
                onClick={() => onVideoSelect(video.video_id)}
                className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm transition-colors"
              >
                View Details
              </button>
            )}
          </div>
          
          {/* Interactive elements */}
          <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-4">
            {/* Like button */}
            <button className="p-3 bg-black/30 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            
            {/* Comment button */}
            <button className="p-3 bg-black/30 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            {/* Share button */}
            <button className="p-3 bg-black/30 rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      
      {/* Loading more indicator at bottom */}
      {videos.length > 0 && (
        <div 
          ref={loaderRef}
          className="h-24 flex items-center justify-center"
        >
          {loadingMore ? (
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          ) : hasMore ? (
            <p className="text-white/50 text-sm">Scroll for more videos</p>
          ) : (
            <p className="text-white/50 text-sm">No more videos to load</p>
          )}
        </div>
      )}
    </div>
  );
}
