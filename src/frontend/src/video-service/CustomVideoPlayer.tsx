import { useEffect, useRef, useState } from 'react';
import { useActor } from '../ic/Actors';
import { HLSVideoPlayer } from './HLSVideoPlayer';
import { useVideoService } from './VideoServiceProvider';
import { FFmpegService } from './ffmpeg/FFmpegService';
import { IPFSService } from './ipfs/IPFSService';

// Interface for direct video playback
interface DirectVideo {
  url: string;
  type: string;
}

export interface CustomVideoPlayerProps {
  videoId: string;       // The IPFS CID or the "video_id" in your system
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

/**
 * Custom video player that:
 * 1. Fetches the original video from IPFS gateway.
 * 2. Uses FFmpeg WASM to convert it to HLS in-memory.
 * 3. Passes that HLS blob to HLSVideoPlayer.
 */
export function CustomVideoPlayer({
  videoId,
  autoPlay = false,
  loop = false,
  className = '',
  onPlay,
  onPause,
  onEnded,
  onError,
  onProgress
}: CustomVideoPlayerProps) {
  const actor = useActor();
  const { betaModeEnabled, isDirectFallbackAllowed } = useVideoService();
  const ffmpegService = FFmpegService.getInstance();

  const [m3u8Url, setM3u8Url] = useState<string>('');
  const [directVideo, setDirectVideo] = useState<DirectVideo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const viewLogged = useRef(false);

  // Log view event
  const logViewEvent = async (completed: boolean = false) => {
    if (!actor || !videoId || viewLogged.current) return;
    
    try {
      // @ts-ignore - Backend method
      await actor.log_watch_event(videoId, 0, completed, false);
      viewLogged.current = true;
    } catch (err) {
      console.error('Failed to log view event:', err);
    }
  };

  // On mount: fetch the IPFS file from a gateway
  useEffect(() => {
    if (!videoId) return;

    let aborted = false;
    let timeoutId: number | null = null;
    
    // Reset logged view flag when mounting
    viewLogged.current = false;

    const processVideo = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        // Set a timeout to prevent infinite loading
        timeoutId = window.setTimeout(() => {
          if (!aborted) {
            console.error('[CustomVideoPlayer] Conversion timed out after 60 seconds');
            setFetchError('Video conversion timed out. The file may be too large for browser processing.');
            setLoading(false);
          }
        }, 60000); // 60 second timeout for conversion

        console.log('[CustomVideoPlayer] Starting conversion process for videoId:', videoId);

        // First, fetch video metadata to get the IPFS CID
        let ipfsCid = videoId; // Default to using videoId as CID

        if (actor) {
          try {
            console.log('[CustomVideoPlayer] Fetching video metadata from backend for:', videoId);
            // @ts-ignore - Backend method
            const response = await actor.get_video_metadata(videoId);
            
            if (response && "Ok" in response) {
              const metadata = response.Ok;
              console.log('[CustomVideoPlayer] Metadata retrieved:', metadata);
              
              // Extract storage reference if available
              if (metadata.storage_ref && metadata.storage_ref.length > 0) {
                const storageRef = metadata.storage_ref[0];
                if (storageRef.startsWith('ipfs:')) {
                  ipfsCid = storageRef.substring(5);
                  console.log('[CustomVideoPlayer] Using IPFS CID from metadata:', ipfsCid);
                }
              }
            }
          } catch (metadataErr) {
            console.warn('[CustomVideoPlayer] Metadata fetch failed, using videoId as CID:', metadataErr);
          }
        }

        // Check if component is still mounted
        if (aborted) {
          console.log('[CustomVideoPlayer] Component unmounted during metadata fetch');
          return;
        }

        // 1. Fetch the original video from IPFS
        // First try using the backend proxy to avoid CORS issues
        const ipfsService = IPFSService.getInstance();
        // We don't need to get the URL here since we're using the proxy
        console.log('[CustomVideoPlayer] Fetching original video from IPFS:', ipfsCid);
        
        // Variable to hold the response
        let arrayBuf: ArrayBuffer;
        let fileSize = 0;
        
        try {
          console.log('[CustomVideoPlayer] Attempting to fetch via backend proxy');
          
          // Try to fetch via backend proxy first (which handles auth internally)
          const response = await ipfsService.fetchViaBackendProxy(ipfsCid);
          
          if (!response.ok) {
            throw new Error(`Backend proxy fetch failed: ${response.status} ${response.statusText}`);
          }
          
          fileSize = parseInt(response.headers.get('content-length') || '0');
          console.log(`[CustomVideoPlayer] File size from proxy: ${fileSize} bytes (${(fileSize/1024/1024).toFixed(2)} MB)`);
          
          // Check file size to prevent browser crashes
          if (fileSize > 50 * 1024 * 1024) { // 50MB limit
            console.warn('[CustomVideoPlayer] File is large (>50MB) and may cause browser performance issues');
          }
          
          arrayBuf = await response.arrayBuffer();
          console.log('[CustomVideoPlayer] Successfully fetched video data via proxy');
        } catch (fetchError) {
          console.error('[CustomVideoPlayer] Video fetch failed:', fetchError);
          
          // We could add specialized error handling here based on error types
          // For example, different handling for network errors vs authentication errors
          
          // If the JWT might be invalid, we could attempt to refresh it here
          // For now, just rethrow the error to be handled by the error state
          if (fetchError instanceof Error) {
            throw new Error(`Failed to fetch video: ${fetchError.message}`);
          } else {
            throw new Error(`Failed to fetch video: ${String(fetchError)}`);
          }
        }
        
        if (aborted) {
          console.log('[CustomVideoPlayer] Component unmounted during video fetch');
          return;
        }

        // Check minimum file size to prevent processing empty files
        if (arrayBuf.byteLength < 1000) { // 1KB minimum
          throw new Error('Video file is too small or empty');
        }

        // Check if we're in beta mode and can use direct playback
        if (betaModeEnabled && isDirectFallbackAllowed()) {
          console.log('[CustomVideoPlayer] Beta mode enabled, using direct playback');
          
          // Create a blob URL for direct playback from the fetched data
          const blob = new Blob([arrayBuf], { type: 'video/mp4' });
          const directUrl = URL.createObjectURL(blob);
          
          console.log('[CustomVideoPlayer] Created direct playback URL');
          // Clear the timeout since we're done
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          setDirectVideo({
            url: directUrl,
            type: 'video/mp4'
          });
          setLoading(false);
        } else {
          // Standard FFmpeg conversion path (non-beta mode)
          console.log(`[CustomVideoPlayer] Creating File object with ${arrayBuf.byteLength} bytes`);
          const file = new File([arrayBuf], 'original.mp4', { type: 'video/mp4' });

          // 2. Convert to HLS in-memory
          console.log('[CustomVideoPlayer] Starting FFmpeg conversion to HLS...');
          const result = await ffmpegService.convertToHLS(file);
          
          if (aborted) {
            console.log('[CustomVideoPlayer] Component unmounted during conversion');
            return;
          }

          console.log('[CustomVideoPlayer] Conversion completed successfully');
          // Clear the timeout since conversion succeeded
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          setM3u8Url(result.playlistUrl);
          setLoading(false);
        }
        
        // Log watch event
        logViewEvent();
      } catch (err: any) {
        console.error('[CustomVideoPlayer] Conversion process failed:', err);
        if (!aborted) {
          // Clear the timeout if it exists
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          setFetchError(err.message || String(err));
          setLoading(false);
          if (onError) onError(err);
        }
      }
    };

    processVideo();

    return () => {
      console.log('[CustomVideoPlayer] Component unmounting, cleaning up');
      aborted = true;
      // Clear any pending timeout
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      // Reset logged view flag when unmounting
      viewLogged.current = false;
    };
  }, [videoId, actor]);

  // Handle video completion event
  const handleEnded = () => {
    logViewEvent(true);
    if (onEnded) onEnded();
  };

  // If there's an error, display a message
  if (fetchError) {
    return (
      <div className={`relative bg-black text-white p-4 ${className}`}>
        <p className="text-red-400">Error loading video: {fetchError}</p>
      </div>
    );
  }

  // If still loading, show spinner with appropriate message
  if (loading) {
    const loadingMessage = betaModeEnabled && isDirectFallbackAllowed() 
      ? "Loading video for direct playback..." 
      : "Converting video in browser...";
      
    return (
      <div className={`relative bg-black text-white flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        <span className="ml-2">{loadingMessage}</span>
        {betaModeEnabled && (
          <div className="absolute top-1 right-1 text-xs text-amber-400">Beta Mode</div>
        )}
      </div>
    );
  }

  // Direct video playback for beta mode
  if (directVideo) {
    console.log('[CustomVideoPlayer] Rendering direct video playback in beta mode');
    return (
      <div className={`relative ${className}`}>
        {betaModeEnabled && (
          <div className="text-amber-400 text-xs px-2 py-1 bg-black bg-opacity-70 absolute top-0 left-0 z-10 rounded-br">
            Beta Mode: Direct Playback
          </div>
        )}
        <video
          src={directVideo.url}
          autoPlay={autoPlay}
          loop={loop}
          controls
          className={`w-full h-full ${className}`}
          onPlay={() => {
            logViewEvent();
            if (onPlay) onPlay();
          }}
          onPause={onPause}
          onEnded={handleEnded}
          onError={(e) => {
            console.error('[CustomVideoPlayer] Direct playback error:', e);
            if (onError) onError(e);
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (onProgress && video.duration) {
              onProgress(video.currentTime, video.duration);
            }
          }}
        />
      </div>
    );
  }
  
  // HLS playback using FFmpeg conversion results
  if (m3u8Url) {
    return (
      <HLSVideoPlayer
        src={m3u8Url}
        autoPlay={autoPlay}
        loop={loop}
        controls
        className={`w-full h-full ${className}`}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={handleEnded}
        onError={onError}
        onProgress={onProgress}
      />
    );
  }
  
  // This state should never happen, but just in case
  return (
    <div className={`relative bg-black text-white p-4 ${className}`}>
      <p className="text-red-400">Error: No playback method available</p>
    </div>
  );
}
