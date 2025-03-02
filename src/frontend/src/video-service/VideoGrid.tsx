import { useEffect, useState } from 'react';
import { useActor } from '../ic/Actors';
import { useVideoService } from './VideoServiceProvider';

interface VideoGridProps {
  tag?: string;
  className?: string;
  onVideoSelect?: (videoId: string) => void;
}

export function VideoGrid({ tag, className = '', onVideoSelect }: VideoGridProps) {
  const actor = useActor();
  // We're not using getVideoUrl directly in this component
  const { } = useVideoService();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sample videos for testing when backend has no videos
  const sampleVideos = [
    {
      video_id: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      title: 'Big Buck Bunny',
      description: 'A sample video',
      tags: ['sample', 'animation'],
      thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
      storage_ref: ['ipfs:QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'],
      timestamp: BigInt(Date.now() / 1000 - 86400),
      uploader_principal: 'SAMPLE'
    },
    {
      video_id: 'QmSZCk5C3dKWmJPJ1TAcC4TW3NVuAZnzJm2kTU7bSDmCFN',
      title: 'Elephants Dream',
      description: 'Another sample video',
      tags: ['sample', 'animation'],
      thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Elephants_Dream_poster.jpg',
      storage_ref: ['ipfs:QmSZCk5C3dKWmJPJ1TAcC4TW3NVuAZnzJm2kTU7bSDmCFN'],
      timestamp: BigInt(Date.now() / 1000 - 172800),
      uploader_principal: 'SAMPLE'
    }
  ];

  // Fetch videos from backend
  useEffect(() => {
    const fetchVideos = async () => {
      if (!actor) {
        console.log("No actor available");
        setLoading(false);
        setVideos(sampleVideos); // Use sample videos when no actor
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch videos from backend
        let videoList: any[] = [];
        
        if (tag && tag !== "all" && tag !== "All") {
          // @ts-ignore - Backend method
          videoList = await actor.list_videos_by_tag(tag.toLowerCase());
        } else {
          // @ts-ignore - Backend method
          videoList = await actor.list_all_videos();
        }
        
        console.log("Fetched videos:", videoList);
        
        // If no videos, use sample videos for testing
        if (!videoList || videoList.length === 0) {
          console.log("No videos found in backend, using sample videos");
          videoList = sampleVideos;
        }
        
        // Sort by timestamp (newest first)
        videoList.sort((a, b) => {
          const timeA = typeof a.timestamp === 'bigint' ? Number(a.timestamp) : Number(a.timestamp);
          const timeB = typeof b.timestamp === 'bigint' ? Number(b.timestamp) : Number(b.timestamp);
          return timeB - timeA;
        });
        
        setVideos(videoList);
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("Failed to load videos: " + (err instanceof Error ? err.message : String(err)));
        
        // Use sample videos as fallback
        setVideos(sampleVideos);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [actor, tag]);

  // Format time ago from timestamp
  const formatTimeAgo = (timestamp: bigint | number) => {
    const now = Date.now() / 1000;
    const time = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
    const diff = now - time;
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return new Date(time * 1000).toLocaleDateString();
  };

  // This function is currently unused but may be needed later
  // when we implement video playback directly in the grid
  /* 
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
  */

  // Get thumbnail for a video
  const getThumbnail = (video: any) => {
    // If video has a thumbnail property, use it
    if (video.thumbnail) return video.thumbnail;
    
    // Try to extract thumbnail from storage ref
    if (video.storage_ref) {
      const storageRef = Array.isArray(video.storage_ref) 
        ? video.storage_ref[0] 
        : video.storage_ref;
      
      if (storageRef && storageRef.startsWith('ipfs:')) {
        const cid = storageRef.substring(5);
        return `https://cloudflare-ipfs.com/ipfs/${cid}/thumbnail.jpg`;
      }
    }
    
    // Default thumbnail
    return '/header.png';
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-video bg-gray-700 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
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

  // Show empty state - should never happen now that we have sample videos
  if (videos.length === 0) {
    return (
      <div className={`bg-gray-800 p-6 rounded-lg text-center ${className}`}>
        <h3 className="text-lg font-medium mb-2">No Videos Found</h3>
        <p className="text-gray-400">
          {tag ? `No videos found with the tag "${tag}"` : 'No videos have been uploaded yet'}
        </p>
      </div>
    );
  }

  // Render videos
  return (
    <div className={`${className}`}>
      <div className="text-center py-2 mb-6 bg-gray-800 rounded">
        <h2 className="text-lg font-medium">Found {videos.length} videos to display</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map(video => (
          <div 
            key={video.video_id}
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
            onClick={() => onVideoSelect && onVideoSelect(video.video_id)}
          >
            {/* Video thumbnail */}
            <div className="aspect-video bg-gray-900 relative">
              {/* Static thumbnail image */}
              <img 
                src={getThumbnail(video)} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
              
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 bg-black/50 hover:opacity-100 transition-opacity">
                <div className="p-3 bg-white/30 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Video info */}
            <div className="p-4">
              <h3 className="font-medium text-lg mb-1 truncate">{video.title}</h3>
              
              <div className="flex items-center text-sm text-gray-400 mb-2">
                <span className="mr-2">{formatTimeAgo(video.timestamp)}</span>
                {video.uploader_principal && video.uploader_principal !== 'SAMPLE' && (
                  <span className="truncate">by {video.uploader_principal.toString().slice(0, 8)}...</span>
                )}
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {video.tags && video.tags.map((tag: string, i: number) => (
                  <span 
                    key={i} 
                    className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}