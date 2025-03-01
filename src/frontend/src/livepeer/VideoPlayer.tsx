import { useState, useEffect, useRef } from 'react';
import { useActor } from '../ic/Actors';
import { useSiwe } from 'ic-siwe-js/react';
import { useLivepeer } from './LivepeerProvider';
import { BackendExtended } from './types';

interface VideoPlayerProps {
  videoId: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onCompletion?: () => void;
}

export function VideoPlayer({ 
  videoId, 
  className = '', 
  autoPlay = false, 
  loop = true,
  onCompletion
}: VideoPlayerProps) {
  const actor = useActor();
  const { identity } = useSiwe();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [watchDuration, setWatchDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastLogTime, setLastLogTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Interval for logging watch events (every 15 seconds)
  const LOG_INTERVAL = 15000; 

  // Load video metadata from backend
  useEffect(() => {
    if (!videoId || !actor) return;
    setIsLoading(true);

    // Cast the actor to our extended type
    const backendActor = actor as unknown as BackendExtended;

    backendActor.getVideoMetadata(videoId)
      .then((response: any) => {
        if ('Ok' in response) {
          const metadata = response.Ok;
          
          // Extract playback ID from storage_ref
          if (metadata.storage_ref && metadata.storage_ref[0]) {
            const storageRef = metadata.storage_ref[0];
            if (storageRef.startsWith('livepeer:')) {
              setPlaybackId(storageRef.substring(9));
            } else {
              setPlaybackId(storageRef);
            }
          }
        } else if ('Err' in response) {
          setError(`Failed to load video: ${response.Err}`);
        }
        setIsLoading(false);
      })
      .catch((err: Error) => {
        console.error('Error fetching video metadata:', err);
        setError('Failed to load video: ' + err.message);
        setIsLoading(false);
      });
  }, [actor, videoId]);

  // Handle video progress and completion
  const handleProgress = () => {
    if (!identity || !videoRef.current) return; // Don't track if not logged in or no video
    
    // Update watch duration
    const currentTime = videoRef.current.currentTime || 0;
    setWatchDuration(Math.max(watchDuration, Math.floor(currentTime)));
    
    // Check if video completed (>90% watched)
    const duration = videoRef.current.duration || 0;
    const percentWatched = duration > 0 ? currentTime / duration : 0;
    const completed = percentWatched > 0.9;
    
    if (completed && !isCompleted) {
      setIsCompleted(true);
      onCompletion?.();
    }
    
    // Log watch events periodically
    const now = Date.now();
    if (now - lastLogTime >= LOG_INTERVAL) {
      // Log the watch event
      logWatchEvent(Math.floor(currentTime), liked, completed);
      setLastLogTime(now);
    }
  };

  // Log watch event to backend
  const logWatchEvent = async (duration: number, liked: boolean, completed: boolean) => {
    if (!actor) return;
    
    try {
      // Cast the actor to our extended type
      const backendActor = actor as unknown as BackendExtended;
      await backendActor.logWatchEvent(videoId, duration, liked, completed);
    } catch (err) {
      console.error('Failed to log watch event:', err);
    }
  };

  // Handle like button click
  const handleLikeClick = () => {
    if (!identity) return; // Don't allow liking if not logged in
    
    const newLikedState = !liked;
    setLiked(newLikedState);
    
    // Log the watch event with new liked state
    logWatchEvent(watchDuration, newLikedState, isCompleted);
  };

  // Set up time update listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => handleProgress();
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [identity, lastLogTime, watchDuration, liked, isCompleted]);

  // Log final watch event when component unmounts
  useEffect(() => {
    return () => {
      if (identity && watchDuration > 0) {
        logWatchEvent(watchDuration, liked, isCompleted);
      }
    };
  }, [watchDuration, liked, isCompleted, videoId, identity]);

  // Get the livepeer client at the component level
  const livepeerClient = useLivepeer();
  
  // Get playback URL
  useEffect(() => {
    if (!playbackId) return;
    
    // Skip API calls for development fallback IDs
    if (playbackId.startsWith('dev-pb-') || playbackId.startsWith('upload-')) {
      console.log('Using sample video for development playback ID:', playbackId);
      setIsLoading(false);
      
      if (videoRef.current) {
        // Use a sample video for development
        const sampleVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        videoRef.current.src = sampleVideoUrl;
        videoRef.current.load();
      }
      return;
    }
    
    // Get the playback URL
    const getPlaybackInfo = async () => {
      try {
        setIsLoading(true);
        console.log('Getting playback info for ID:', playbackId);
        
        // Use the client from the component level
        const playbackInfo = await livepeerClient.getPlaybackInfo(playbackId);
        console.log('Playback info received:', playbackInfo);
        
        if (videoRef.current) {
          // Check if we have received source information
          if (playbackInfo.meta?.source && playbackInfo.meta.source.length > 0) {
            // First try to find an HLS source (best for adaptive streaming)
            const hls = playbackInfo.meta.source.find(src => 
              src.type === 'html5/hls' || src.type === 'application/x-mpegURL'
            );
            
            if (hls && hls.url) {
              console.log('Using HLS playback URL:', hls.url);
              videoRef.current.src = hls.url;
              videoRef.current.load();
            } 
            // Then try MP4
            else if (playbackInfo.meta.source.length > 0) {
              const mp4 = playbackInfo.meta.source.find(src => 
                src.type === 'video/mp4' || src.url.endsWith('.mp4')
              );
              
              if (mp4 && mp4.url) {
                console.log('Using MP4 playback URL:', mp4.url);
                videoRef.current.src = mp4.url;
                videoRef.current.load();
              }
              // Fallback to the first source of any type
              else {
                console.log('Using fallback playback URL:', playbackInfo.meta.source[0].url);
                videoRef.current.src = playbackInfo.meta.source[0].url;
                videoRef.current.load();
              }
            }
          } 
          // If we don't have source information, try direct URL construction
          else {
            console.log('No source info available, trying direct CDN URL');
            // Try direct HLS URL as a fallback
            videoRef.current.src = `https://livepeercdn.com/hls/${playbackId}/index.m3u8`;
            videoRef.current.load();
            
            // Add a listener to catch playback errors and try alternative URL
            const handleError = () => {
              console.log('HLS playback failed, trying direct MP4');
              videoRef.current!.src = `https://livepeercdn.com/recordings/${playbackId}/source.mp4`;
              videoRef.current!.load();
              videoRef.current!.removeEventListener('error', handleError);
            };
            
            videoRef.current.addEventListener('error', handleError, { once: true });
          }
        }
      } catch (err) {
        console.error('Error getting playback URL:', err);
        
        // Even if API fails, try direct URL as a last resort
        if (videoRef.current) {
          console.log('API error, trying direct CDN URL as last resort');
          videoRef.current.src = `https://livepeercdn.com/hls/${playbackId}/index.m3u8`;
          videoRef.current.load();
          
          // Add a listener to catch playback errors and use a sample video as final fallback
          const handleFinalError = () => {
            console.log('All playback attempts failed, using sample video');
            videoRef.current!.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            videoRef.current!.load();
            videoRef.current!.removeEventListener('error', handleFinalError);
          };
          
          videoRef.current.addEventListener('error', handleFinalError, { once: true });
        }
        
        setError('Playback error - trying alternative sources');
      } finally {
        setIsLoading(false);
      }
    };
    
    getPlaybackInfo();
  }, [playbackId, livepeerClient]);

  return (
    <div className={`${className}`}>
      {error ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded-lg mb-4">
          {error}
        </div>
      ) : isLoading || !playbackId ? (
        <div className="flex items-center justify-center bg-zinc-800 aspect-[9/16] rounded-lg">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-zinc-700 mb-2" />
            <div className="h-4 w-24 bg-zinc-700 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay={autoPlay}
            loop={loop}
            muted={isMuted}
            playsInline
            controls
            onEnded={() => {
              setIsCompleted(true);
              logWatchEvent(watchDuration, liked, true);
              onCompletion?.();
            }}
          />
          
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-t from-black/80 to-transparent">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                }
              }}
              className="text-white p-2 rounded-full hover:bg-white/20"
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <button 
              onClick={handleLikeClick}
              className={`p-2 rounded-full transition-colors ${liked ? 'text-red-500' : 'text-white hover:bg-white/20'}`}
              disabled={!identity}
            >
              {liked ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}