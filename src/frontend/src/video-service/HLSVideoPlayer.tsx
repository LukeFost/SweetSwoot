import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export interface HLSVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

export function HLSVideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = '',
  onPlay,
  onPause,
  onEnded,
  onError,
  onProgress
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Setup HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reset error state
    setHasError(false);
    setIsLoading(true);

    if (!src) {
      setIsLoading(false);
      return;
    }

    const playVideo = () => {
      if (autoPlay && video) {
        video.play().catch(err => {
          console.warn('[HLSVideoPlayer] Autoplay prevented:', err);
        });
      }
      setIsLoading(false);
    };

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60
      });

      hlsRef.current = hls;

      // Bind HLS to video element
      hls.loadSource(src);
      hls.attachMedia(video);

      // Events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playVideo();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLSVideoPlayer] Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLSVideoPlayer] Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              onError && onError(data);
              console.error('[HLSVideoPlayer] Fatal error:', data);
              break;
          }
        }
      });

      return () => {
        // Cleanup
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari, which has native HLS support
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        playVideo();
      });

      return () => {
        video.removeEventListener('loadedmetadata', playVideo);
        video.src = '';
      };
    } else {
      setHasError(true);
      setIsLoading(false);
      console.error('[HLSVideoPlayer] HLS not supported in this browser');
      onError && onError(new Error('HLS not supported'));
    }
  }, [src, autoPlay, onError]);

  // Handle event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      if (onPause) onPause();
    };

    const handleEnded = () => {
      if (onEnded) onEnded();
    };

    const handleError = (e: Event) => {
      setHasError(true);
      setIsLoading(false);
      if (onError) onError(e);
    };

    const handleProgress = () => {
      if (onProgress && video.duration > 0) {
        onProgress(video.currentTime, video.duration);
      }
    };

    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleProgress);

    return () => {
      // Clean up event listeners
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleProgress);
    };
  }, [onPlay, onPause, onEnded, onError, onProgress]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        className="w-full h-full object-cover"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p>Error playing video</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
