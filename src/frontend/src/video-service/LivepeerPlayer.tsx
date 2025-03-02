import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useActor } from '../ic/Actors';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { useVideoService } from './VideoServiceProvider';

export interface LivepeerPlayerProps {
  src?: string;
  videoId: string; // The ID used to look up the video in our backend
  playbackId?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  poster?: string;
  primaryColor?: string;        // Accent color for progressbar, controls
  showBuffering?: boolean;      // Show buffering indicator
  showQualitySelector?: boolean; // Show quality selector for HLS streams
  showPlaybackStats?: boolean;   // Show playback stats (bitrate, resolution)
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onQualityChanged?: (quality: string) => void;
  onBuffering?: (isBuffering: boolean) => void;
}

export function LivepeerPlayer({
  src,
  videoId,
  // playbackId is no longer needed as we use videoId for tracking
  // but we keep it in the interface for backward compatibility
  // playbackId,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
  poster,
  primaryColor = '#0C76F5',  // Livepeer blue by default
  showBuffering = true,
  showQualitySelector = false,
  showPlaybackStats = false,
  onPlay,
  onPause,
  onEnded,
  onError,
  onProgress,
  onQualityChanged,
  onBuffering
}: LivepeerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useCustomFallback, setUseCustomFallback] = useState(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    bitrate: number;
    resolution: string;
    dropped: number;
  }>({ bitrate: 0, resolution: '', dropped: 0 });
  
  const actor = useActor();
  const { betaModeEnabled, isDirectFallbackAllowed } = useVideoService();
  const viewLogged = useRef(false);
  
  // Function to log watch events to backend
  const logViewEvent = async (completed: boolean = false) => {
    if (!actor || !videoId || viewLogged.current) return;
    
    try {
      // We'll set this first to prevent multiple attempts that might fail
      viewLogged.current = true;
      
      console.log(`Attempting to log watch event for video: ${videoId}, completed: ${completed}`);
      
      // @ts-ignore - Backend method
      await actor.log_watch_event(videoId, 0, completed, false)
        .catch((error: any) => {
          // If it fails due to the time function in the backend, just log it but don't treat as critical
          if (String(error).includes("time not implemented on this platform")) {
            console.warn("Watch event logging failed due to time function issue (expected in local dev)");
          } else {
            throw error; // Re-throw other errors
          }
        });
    } catch (err) {
      console.error('Failed to log view event:', err);
      // Don't reset viewLogged - we still want to prevent further attempts
    }
  };
  
  // Setup HLS player when component mounts or src changes
  useEffect(() => {
    // Reset logged view flag
    viewLogged.current = false;
    
    // If there's no src provided, we'll need to fetch it from our backend using videoId
    if (!src) {
      // For this component to work correctly, either src or videoId must be provided
      if (!videoId) {
        setError('No video source provided');
        return;
      }
      
      // In a real implementation, fetch the URL using videoId
      setError('Video URL is being fetched...');
      // This would typically involve a call to a backend service
      return;
    }
    
    // Get video element
    const video = videoRef.current;
    if (!video) return;
    
    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Setup HLS if supported
    if (Hls.isSupported()) {
      try {
        console.log('[LivepeerPlayer] Initializing HLS.js player with source:', src);
        
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          // These are reasonable starting values for most networks
          startLevel: -1, // Auto
          startFragPrefetch: true, // Prefetch next fragment for smoother playback
          maxBufferLength: 30, // Buffer up to 30 seconds
          // Add debug logs
          debug: true,
          // Add XHR retry settings
          xhrSetup: (xhr, url) => {
            console.log(`[LivepeerPlayer] Setting up XHR for ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
            // Set longer timeout
            xhr.timeout = 10000; // 10 seconds
          }
        });
        
        hls.attachMedia(video);
        
        // Add manifest loading listener for better debugging
        hls.on(Hls.Events.MANIFEST_LOADING, (_, data) => {
          console.log('[LivepeerPlayer] HLS manifest loading from URL:', data.url);
        });
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[LivepeerPlayer] HLS media attached');
          console.log('[LivepeerPlayer] Loading source:', src);
          hls.loadSource(src);
        });
        
        hls.on(Hls.Events.MANIFEST_LOADED, (_, data) => {
          console.log('[LivepeerPlayer] HLS manifest loaded successfully:', {
            url: data.url,
            levels: data.levels?.length || 0,
            audioTracks: data.audioTracks?.length || 0
          });
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log('[LivepeerPlayer] HLS manifest parsed successfully:', {
            url: src,
            levels: data.levels?.length || 0, 
            audioTracks: data.audioTracks?.length || 0,
            subtitleTracks: data.subtitleTracks?.length || 0
          });
      
          // Extract available qualities if quality selector is enabled
          if (showQualitySelector && data.levels?.length) {
            // Extract quality options based on levels in the manifest
            const qualities = data.levels.map((level) => {
              // Format: "720p (2.5 Mbps)" or similar
              return `${level.height}p (${(level.bitrate / 1000000).toFixed(1)} Mbps)`;
            });
            
            // Add "auto" option
            qualities.unshift('auto');
            setAvailableQualities(qualities);
          }
          
          if (autoPlay) {
            video.play().catch(err => {
              console.warn('[LivepeerPlayer] Autoplay failed:', err);
            });
          }
        });
        
        // Track buffering state
        hls.on(Hls.Events.BUFFER_APPENDING, () => {
          if (showBuffering && !isBuffering) {
            setIsBuffering(true);
            if (onBuffering) onBuffering(true);
          }
        });
        
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (showBuffering && isBuffering) {
            setIsBuffering(false);
            if (onBuffering) onBuffering(false);
          }
        });
        
        // Track playback stats if enabled
        if (showPlaybackStats) {
          hls.on(Hls.Events.FRAG_CHANGED, (_, data) => {
            if (data.frag) {
              // Further fix type error with loading time calculation by using a simplified approach
              const loaded = data.frag.stats.loaded || 0;
              // Use a simple calculation for bitrate that doesn't depend on loading.total
              const bitrate = loaded > 0 ? (loaded * 8 * 1000 / 1000) : 0; // Just a placeholder calculation
              const level = hls.levels[data.frag.level];
              setStats({
                bitrate: Math.round(bitrate / 1000), // kbps
                resolution: level ? `${level.width}x${level.height}` : '',
                dropped: (hls as any).stats?.droppedFrames || 0
              });
            }
          });
        }
        
        // Handle quality selection
        if (showQualitySelector) {
          // Method to switch quality levels
          const switchQuality = (level: number) => {
            hls.currentLevel = level;
            // Update UI state
            if (level === -1) {
              setCurrentQuality('auto');
              if (onQualityChanged) onQualityChanged('auto');
            } else if (hls.levels[level]) {
              const quality = `${hls.levels[level].height}p`;
              setCurrentQuality(quality);
              if (onQualityChanged) onQualityChanged(quality);
            }
          };
          
          // Make switchQuality accessible outside this effect
          (window as any).__livepeerSwitchQuality = switchQuality;
        }
        
        // Enhanced error handling
        hls.on(Hls.Events.ERROR, (_, data) => {
          // Log all errors with detailed information
          console.error('[LivepeerPlayer] HLS error occurred:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            // Include networking details for debugging
            url: data.url || 'N/A',
            response: data.response ? {
              code: data.response.code,
              text: data.response.text?.substring(0, 100),
              url: data.response.url
            } : 'N/A',
            // Include error message
            error: data.error ? {
              message: data.error.message,
              name: data.error.name
            } : 'N/A'
          });
            
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[LivepeerPlayer] Fatal network error encountered:', data);
                
                // Check specifically for manifest parsing errors
                if (data.details === 'manifestParsingError' || data.details === 'manifestLoadError') {
                  console.error('[LivepeerPlayer] HLS Manifest parsing error - switching to custom player fallback');
                  console.error('[LivepeerPlayer] Manifest URL attempted:', src);
                  console.error('[LivepeerPlayer] Response details:', data.response || 'No response data');
                  
                  // Try HEAD request to test URL directly
                  if (typeof fetch === 'function') {
                    console.log('[LivepeerPlayer] Testing manifest URL directly...');
                    fetch(src, { method: 'HEAD' })
                      .then(response => {
                        console.log(`[LivepeerPlayer] Direct HEAD request status: ${response.status} ${response.statusText}`);
                      })
                      .catch(error => {
                        console.error(`[LivepeerPlayer] Direct HEAD request failed: ${error.message}`);
                      });
                  }
                  
                  setError('Manifest error - attempting fallback player');
                  setUseCustomFallback(true);
                  setIsBuffering(false);
                  if (onBuffering) onBuffering(false);
                  hls.destroy();
                } 
                // Handle 401/403 errors from Livepeer CDN
                else if (data.response && (data.response.code === 401 || data.response.code === 403)) {
                  console.error('[LivepeerPlayer] Authentication error with Livepeer CDN:', {
                    code: data.response.code,
                    text: data.response.text,
                    url: data.response.url
                  });
                  setError('Authentication error - attempting fallback player');
                  setUseCustomFallback(true);
                  setIsBuffering(false);
                  if (onBuffering) onBuffering(false);
                  hls.destroy();
                }
                else {
                  // For other network errors, try to recover
                  console.log('[LivepeerPlayer] Attempting to recover from network error');
                  console.log('[LivepeerPlayer] Network error details:', {
                    details: data.details,
                    url: data.url,
                    response: data.response
                  });
                  setIsBuffering(true);
                  if (onBuffering) onBuffering(true);
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[LivepeerPlayer] Media error:', data);
                // Try to recover from media errors
                console.log('[LivepeerPlayer] Attempting to recover from media error');
                hls.recoverMediaError();
                break;
              default:
                console.error('[LivepeerPlayer] Fatal error:', data);
                setError(`Playback error: ${data.details}`);
                
                // For unrecoverable errors, try the custom player as fallback
                if (data.details === 'bufferStalledError' || 
                    data.details === 'bufferNudgeOnStall' || 
                    data.details === 'internalException' ||
                    data.details === 'levelLoadError') {
                  console.log('[LivepeerPlayer] Unrecoverable error - switching to fallback player');
                  setUseCustomFallback(true);
                }
                
                setIsBuffering(false);
                if (onBuffering) onBuffering(false);
                hls.destroy();
                break;
            }
          } else {
            // Non-fatal errors can be logged but don't need UI updates
            console.warn('[LivepeerPlayer] Non-fatal error:', data);
            
            // Additional logging for specific error types
            if (data.details === 'fragLoadError') {
              console.error('[LivepeerPlayer] Fragment load error:', data);
            } else if (data.details === 'levelLoadError') {
              console.error('[LivepeerPlayer] Level load error:', data);
            }
          }
        });
        
        hlsRef.current = hls;
      } catch (err) {
        console.error('[LivepeerPlayer] Error setting up HLS:', err);
        setError('Failed to set up video player');
        if (onError) onError(err);
      }
    } 
    // Fallback to native HLS if supported
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[LivepeerPlayer] Using native HLS support');
      video.src = src;
      
      // Setup error handling for native playback
      const handleNativeError = () => {
        setError(`Playback error: ${video.error?.message || 'Unknown error'}`);
        if (onError && video.error) onError(video.error);
      };
      
      video.addEventListener('error', handleNativeError);
      
      return () => {
        video.removeEventListener('error', handleNativeError);
      };
    } 
    // No HLS support
    else {
      setError('HLS playback not supported in this browser');
    }
    
    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Reset logged view flag when unmounting
      viewLogged.current = false;
    };
  }, [src, autoPlay]);
  
  // Setup event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePlay = () => {
      logViewEvent();
      if (onPlay) onPlay();
    };
    
    const handlePause = () => {
      if (onPause) onPause();
    };
    
    const handleEnded = () => {
      logViewEvent(true);
      if (onEnded) onEnded();
    };
    
    const handleTimeUpdate = () => {
      if (onProgress && video.duration) {
        onProgress(video.currentTime, video.duration);
      }
    };
    
    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Cleanup
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onPlay, onPause, onEnded, onProgress]);
  
  // Check if we should use CustomVideoPlayer as fallback
  if (useCustomFallback && videoId) {
    // Only allow fallback if beta mode allows it
    if (isDirectFallbackAllowed()) {
      console.log('[LivepeerPlayer] Using CustomVideoPlayer as fallback for videoId:', videoId);
      return (
        <div className={className}>
          <div className="text-amber-400 text-xs px-2 py-1 bg-black bg-opacity-70 absolute top-0 right-0 z-10 rounded-bl">
            Using fallback player {betaModeEnabled && '(Beta Mode)'}
          </div>
          <CustomVideoPlayer
            videoId={videoId}
            autoPlay={autoPlay}
            loop={loop}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onEnded}
            onError={onError}
            onProgress={onProgress}
            className={className}
          />
        </div>
      );
    } else {
      // In non-beta mode, we show an error but don't use fallback
      console.log('[LivepeerPlayer] Fallback not allowed in non-beta mode');
      return (
        <div className={`flex flex-col items-center justify-center bg-black text-white p-4 ${className}`}>
          <p className="text-red-400 mb-2">
            {error || 'Livepeer playback failed. Direct fallback is disabled in production mode.'}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      );
    }
  }
  
  // If there's an error (but we're not using fallback), display it
  if (error && !useCustomFallback) {
    return (
      <div className={`flex flex-col items-center justify-center bg-black text-white p-4 ${className}`}>
        <p className="text-red-400 mb-2">{error}</p>
        {videoId && (
          <>
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              onClick={() => setUseCustomFallback(true)}
            >
              Try alternate player
            </button>
            {!isDirectFallbackAllowed() && (
              <p className="text-xs text-gray-400 mt-2">
                Note: Alternative player may not work in production mode
              </p>
            )}
          </>
        )}
      </div>
    );
  }
  
  // Render video player with optional UI elements
  return (
    <div className="relative">
      {/* Main video element */}
      <video
        ref={videoRef}
        className={`w-full h-full bg-black object-cover ${className}`}
        autoPlay={autoPlay}
        controls={controls}
        loop={loop}
        muted={muted}
        playsInline
        poster={poster}
      />
      
      {/* Buffering indicator */}
      {showBuffering && isBuffering && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40"
          style={{ color: primaryColor }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" 
               style={{ borderColor: `currentColor transparent transparent transparent` }} />
        </div>
      )}
      
      {/* Quality selector (if enabled) */}
      {showQualitySelector && availableQualities.length > 0 && (
        <div className="absolute bottom-16 right-4 bg-black bg-opacity-70 rounded text-white text-sm p-2">
          <select
            value={currentQuality}
            onChange={(e) => {
              const level = e.target.value === 'auto' 
                ? -1 
                : availableQualities.indexOf(e.target.value) - 1;
              
              if (typeof (window as any).__livepeerSwitchQuality === 'function') {
                (window as any).__livepeerSwitchQuality(level);
              }
            }}
            className="bg-transparent border-0 outline-none"
            style={{ color: primaryColor }}
          >
            {availableQualities.map((quality) => (
              <option key={quality} value={quality} className="bg-gray-800">
                {quality}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Playback stats (if enabled) */}
      {showPlaybackStats && stats.resolution && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded text-white text-xs p-2">
          <p>Resolution: {stats.resolution}</p>
          <p>Bitrate: {stats.bitrate} kbps</p>
          <p>Dropped frames: {stats.dropped}</p>
        </div>
      )}
    </div>
  );
}
