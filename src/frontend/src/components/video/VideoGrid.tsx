import { useState, useEffect } from 'react';
import { useActor } from '../../ic/Actors';
import { BackendExtended } from '../../livepeer/types';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

interface VideoGridProps {
  tag?: string;
  className?: string;
  onVideoSelect?: (videoId: string) => void;
}

export function VideoGrid({ tag, className = '', onVideoSelect }: VideoGridProps) {
  const actor = useActor();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed unused state

  // Load videos based on tag or all videos
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const fetchVideos = async () => {
      if (!actor) return;
      
      try {
        let videoList: any[];
        // Cast the actor to our extended type
        const backendActor = actor as unknown as BackendExtended;
        
        if (tag) {
          videoList = await backendActor.list_videos_by_tag(tag.toLowerCase());
        } else {
          // Get videos from the backend actor
          videoList = await actor.list_all_videos();
          console.log("Loaded videos for grid:", videoList);
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

  // Format view counts
  const formatViewCount = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Calculate time ago from timestamp
  const getTimeAgo = (timestamp: bigint) => {
    try {
      return formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });
    } catch (err) {
      return 'Unknown time';
    }
  };

  // Get video thumbnail from storage_ref
  const getVideoThumbnail = (video: any) => {
    if (!video.storage_ref) return '/default-thumbnail.jpg';
    
    // If LivePeer, we could generate thumbnail URL based on playback ID
    // This is a placeholder - you'd need to implement actual thumbnail generation
    if (video.storage_ref.startsWith('livepeer:')) {
      const playbackId = video.storage_ref.substring(9);
      return `https://livepeercdn.com/asset/${playbackId}/thumbnail.jpg`;
    }
    
    return '/default-thumbnail.jpg';
  };

  return (
    <div className={twMerge('container mx-auto px-4 py-6', className)}>
      {/* Search and category tabs removed since they're in the layout */}
      
      {/* Video Grid */}
      {error ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-6 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-2">Error Loading Videos</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[9/16] bg-gray-300 dark:bg-gray-700 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <h3 className="text-xl font-medium mb-2">No Videos Found</h3>
          <p>
            {tag
              ? `No videos found with the category "${tag}"`
              : 'No videos have been uploaded yet'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div 
              key={video.video_id}
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onVideoSelect && onVideoSelect(video.video_id)}
            >
              {/* Video Thumbnail */}
              <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                <img 
                  src={getVideoThumbnail(video)} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Video Info */}
              <div className="flex items-start space-x-2">
                {/* Creator Avatar - could be fetched in the future */}
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-1"></div>
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    @user_{video.uploader_principal.toString().substring(0, 8)}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatViewCount(Math.floor(Math.random() * 20_000_000))} views</span>
                    <span>•</span>
                    <span>{getTimeAgo(video.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}