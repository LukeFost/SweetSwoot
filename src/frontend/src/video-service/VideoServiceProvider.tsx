import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IPFSService } from './ipfs/IPFSService';
import { LivepeerService } from './livepeer/LivepeerService';
import { useActor } from '../ic/Actors';

// Interface for video metadata
export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  playbackUrl: string;
  duration: number;
  ipfsCid?: string;
  uploadDate: number;
  livepeerAssetId?: string;
  livepeerPlaybackId?: string;
}

// Interface for the video service context
interface VideoServiceContextType {
  isLoading: boolean;
  ipfsReady: boolean;
  livepeerReady: boolean;
  betaModeEnabled: boolean;
  uploadVideo: (file: File, title: string, description?: string) => Promise<VideoInfo>;
  getVideoUrl: (cid: string) => string;
  getPlaybackUrl: (assetId: string, playbackId?: string) => string;
  loadVideoById: (id: string) => Promise<VideoInfo | null>;
  isDirectFallbackAllowed: () => boolean;
}

// Create the context
const VideoServiceContext = createContext<VideoServiceContextType | null>(null);

// Provider props
interface VideoServiceProviderProps {
  children: ReactNode;
}

// Video service provider component
export function VideoServiceProvider({ children }: VideoServiceProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [ipfsReady, setIpfsReady] = useState(false);
  const [livepeerReady, setLivepeerReady] = useState(false);
  
  // Check if beta mode is enabled from environment variables
  const betaModeEnabled = import.meta.env.VITE_BETA_MODE === true;
  
  // References to services
  const ipfsService = IPFSService.getInstance();
  const livepeerService = LivepeerService.getInstance();
  
  // Get the backend actor
  const actor = useActor();
  
      // Set the actor reference in IPFSService
      useEffect(() => {
        if (actor) {
          IPFSService.setActor(actor);
        }
      }, [actor]);

      // Initialize services
      useEffect(() => {
        const initServices = async () => {
          setIsLoading(true);
          try {
            // Initialize Piñata SDK with JWT from environment variables
            const pinataInitPromise = async () => {
              try {
                const pinataJWT = import.meta.env.VITE_PINATA_JWT;
                const gatewayUrl = import.meta.env.VITE_GATEWAY_URL;
                
                console.log('[VideoServiceProvider] Environment check:');
                console.log(`- VITE_PINATA_JWT: ${pinataJWT ? 'Configured ✅' : 'Not configured ❌'}`);
                console.log(`- VITE_GATEWAY_URL: ${gatewayUrl ? 'Configured ✅' : 'Optional, not configured'}`);
                
                if (!pinataJWT) {
                  console.error('[VideoServiceProvider] CRITICAL ERROR: Piñata JWT not configured! ❌');
                  console.error('Please add your Piñata JWT to .env.local as VITE_PINATA_JWT=your_jwt_here');
                  console.error('You can also add VITE_GATEWAY_URL=your-gateway-domain.mypinata.cloud');
                  console.error('See docs/PINATA_SETUP.md for detailed instructions');
                  
                  // Still set the loading to false but mark IPFS as not ready
                  setIpfsReady(false);
                  return;
                }
                
                // Validate the JWT format has at least basic JWT structure
                if (!pinataJWT.includes('.') || pinataJWT.length < 20) {
                  console.error('[VideoServiceProvider] Invalid JWT format detected! ❌');
                  console.error('Your VITE_PINATA_JWT appears to be incorrectly formatted.');
                  console.error('JWTs typically contain dots and are longer than 20 characters.');
                  setIpfsReady(false);
                  return;
                }
                
                try {
                  // Set JWT and initialize the SDK
                  await ipfsService.setPinataJWT(pinataJWT);
                  
                  // Set the JWT in the backend as well to enable backend proxy
                  if (actor) {
                    console.log('[VideoServiceProvider] Actor available, checking for set_pinata_jwt method...');
                    console.log('[VideoServiceProvider] Actor methods:', Object.keys(actor));
                    
                    const setPinataJwtMethod = actor.set_pinata_jwt;
                    if (typeof setPinataJwtMethod === 'function') {
                      try {
                        console.log('[VideoServiceProvider] Setting Pinata JWT in backend proxy...');
                        
                        // The backend expects two parameters: JWT and caller principal
                        // But we can just pass the JWT as the API will handle the caller automatically
                        await setPinataJwtMethod(pinataJWT);
                        
                        // Check if JWT was actually set by calling has_pinata_jwt_configured
                        if (actor.has_pinata_jwt_configured && typeof actor.has_pinata_jwt_configured === 'function') {
                          const isConfigured = await actor.has_pinata_jwt_configured();
                          console.log(`[VideoServiceProvider] JWT configuration status: ${isConfigured ? '✅ Configured' : '❌ Not configured'}`);
                          
                          if (isConfigured) {
                            console.log('[VideoServiceProvider] Backend proxy JWT set successfully ✅');
                          } else {
                            throw new Error('JWT was not successfully stored in backend');
                          }
                        } else {
                          console.log('[VideoServiceProvider] Backend proxy JWT set (but unable to verify) ⚠️');
                        }
                      } catch (backendJwtError) {
                        console.warn('[VideoServiceProvider] Failed to set JWT in backend:', backendJwtError);
                        console.warn('Backend proxy may not be able to fetch protected IPFS content');
                        
                        // Try again with an explicitly destructured call to avoid parameter issues
                        try {
                          console.log('[VideoServiceProvider] Retrying with explicit destructuring...');
                          
                          // Get the actual function and call it directly
                          if (actor.actor && typeof actor.actor.set_pinata_jwt === 'function') {
                            await actor.actor.set_pinata_jwt(pinataJWT);
                            console.log('[VideoServiceProvider] Backend proxy JWT set via actor.actor ✅');
                          }
                        } catch (retryError) {
                          console.error('[VideoServiceProvider] Retry also failed:', retryError);
                        }
                      }
                    } else {
                      console.warn('[VideoServiceProvider] set_pinata_jwt method not found on actor');
                      console.warn('This will prevent backend proxy access to protected IPFS content');
                      
                      // Try accessing the method directly on actor.actor if it exists
                      if (actor.actor && typeof actor.actor.set_pinata_jwt === 'function') {
                        try {
                          console.log('[VideoServiceProvider] Found set_pinata_jwt on actor.actor, calling directly...');
                          await actor.actor.set_pinata_jwt(pinataJWT);
                          console.log('[VideoServiceProvider] Backend proxy JWT set via actor.actor ✅');
                        } catch (nestedError) {
                          console.error('[VideoServiceProvider] Failed to set JWT via actor.actor:', nestedError);
                        }
                      }
                    }
                  } else {
                    console.warn('[VideoServiceProvider] Backend actor not available');
                    console.warn('This will prevent backend proxy access to protected IPFS content');
                  }
                  
                  // Check if initialization was successful
                  if (ipfsService.isPinataConfigured()) {
                    setIpfsReady(true);
                    console.log('[VideoServiceProvider] Piñata SDK initialized successfully ✅');
                  } else {
                    console.warn('[VideoServiceProvider] Piñata SDK initialization failed ❌');
                    console.warn('Check your JWT permissions and expiry date.');
                  }
                } catch (initError) {
                  console.error('[VideoServiceProvider] Piñata initialization error:', initError);
                  console.error('Check your JWT and gateway configuration and try again.');
                  setIpfsReady(false);
                }
              } catch (error) {
                console.error('[VideoServiceProvider] Critical Piñata init error:', error);
                setIpfsReady(false);
              }
            };
        
        // Initialize Livepeer
        const livepeerInitPromise = async () => {
          try {
            const livepeerApiKey = import.meta.env.VITE_LIVEPEER_API_KEY;
            
            // Log status of Livepeer API key
            if (!livepeerApiKey) {
              console.error('[VideoServiceProvider] CRITICAL ERROR: Livepeer API key not configured! ❌');
              console.error('Please add your Livepeer API key to .env.local as VITE_LIVEPEER_API_KEY=your_api_key_here');
              
              // Mark Livepeer as not ready
              setLivepeerReady(false);
              return;
            }
            
            // Check for placeholder values
            if (livepeerApiKey.includes('your_') || livepeerApiKey.includes('LIVEPEER_API_KEY')) {
              console.error('[VideoServiceProvider] CRITICAL ERROR: Livepeer API key is using a placeholder value! ❌');
              console.error('Please replace with your actual Livepeer API key in .env.local');
              
              // Mark Livepeer as not ready
              setLivepeerReady(false);
              return;
            }
            
            console.log(`- VITE_LIVEPEER_API_KEY: Configured ✅ (${livepeerApiKey.substring(0, 4)}...${livepeerApiKey.substring(livepeerApiKey.length - 4)})`);
            
            
            // Initialize Livepeer service
            await livepeerService.initialize(livepeerApiKey);
            setLivepeerReady(true);
            console.log('[VideoServiceProvider] Livepeer service initialized successfully ✅');
          } catch (error) {
            console.error('[VideoServiceProvider] Livepeer initialization error:', error);
            setLivepeerReady(false);
          }
        };

        // Initialize both services in parallel
        console.log('[VideoServiceProvider] Starting services initialization...');
        const startTime = Date.now();
        
        await Promise.all([
          pinataInitPromise(),
          livepeerInitPromise()
        ]);
        
        console.log(`[VideoServiceProvider] Services initialization completed in ${Date.now() - startTime}ms`);
      } catch (error) {
        console.error('[VideoServiceProvider] Failed to init services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initServices();
  }, []);
  
  /**
   * Upload and transcode a video:
   * 1. First upload to Pinata/IPFS
   * 2. Then create a Livepeer asset from the IPFS URL
   * 3. Wait for the Livepeer asset to be ready
   * 4. Return the combined metadata
   */
  const uploadVideo = async (
    file: File,
    title: string,
    description?: string
  ): Promise<VideoInfo> => {
    if (!ipfsReady) {
      throw new Error('IPFS not ready. Please check your Pinata JWT configuration.');
    }
    
    if (!livepeerReady) {
      throw new Error('Livepeer not ready. Please check your Livepeer API key configuration.');
    }
    
    try {
      console.log(`[VideoServiceProvider] Starting video upload process for "${title}"...`);
      
      // 1. Upload the original file to IPFS via Pinata
      console.log('[VideoServiceProvider] Step 1: Uploading to IPFS via Pinata...');
      const cid = await ipfsService.uploadFile(file);
      console.log(`[VideoServiceProvider] Video uploaded to IPFS with CID: ${cid}`);
      
      // Get IPFS gateway URL for the uploaded video
      const ipfsUrl = ipfsService.getGatewayUrlSync(cid);
      
      // 2. Create a Livepeer asset using the IPFS URL
      console.log('[VideoServiceProvider] Step 2: Creating Livepeer asset from IPFS URL...');
      
      // Create output profiles for better quality options
      const profiles = [
        {
          name: '720p',
          bitrate: 2000000,
          fps: 30,
          width: 1280,
          height: 720,
        },
        {
          name: '480p',
          bitrate: 1000000,
          fps: 30,
          width: 854, 
          height: 480,
        },
        {
          name: '360p',
          bitrate: 500000,
          fps: 30,
          width: 640,
          height: 360,
        }
      ];
      
      // Import the video from IPFS to Livepeer
      const { asset, playbackId } = await livepeerService.createAsset({
        name: title,
        url: ipfsUrl, // Use the IPFS URL 
        profiles,     // Set quality profiles
        metadata: {
          description,
          source: 'ipfs',
          ipfsCid: cid,
          app: 'ShawtyFormVideo'
        }
      });
      
      console.log(`[VideoServiceProvider] Livepeer asset created with ID: ${asset.id}`);
      console.log(`[VideoServiceProvider] Livepeer playback ID: ${playbackId}`);
      
      // 3. Wait for the asset to be processed (with a timeout)
      console.log('[VideoServiceProvider] Step 3: Waiting for Livepeer to process the video...');
      
      // We don't want to block the UI for too long, so we'll return partial info
      // and let the asset processing continue in the background
      
      // Start the asset monitoring in the background
      livepeerService.waitForAssetReady(asset.id)
        .then(readyAsset => {
          if (readyAsset) {
            console.log(`[VideoServiceProvider] Asset processing complete: ${readyAsset.id}`);
          }
        })
        .catch(err => {
          console.warn(`[VideoServiceProvider] Asset monitoring error: ${err.message}`);
        });
      
      // Generate playback URL
      const playbackUrl = livepeerService.getPlaybackUrl(playbackId);
      
      // Generate a unique ID that combines the CID with a timestamp to prevent duplicate IDs
      // Format: CID-timestamp (using the first 16 chars of CID for readability)
      const timestamp = Date.now();
      const uniqueId = `${cid.substring(0, 16)}-${timestamp}`;
      
      // 4. Return the combined video info
      const videoInfo: VideoInfo = {
        id: uniqueId, // Use our unique composite ID instead of just the CID
        title,
        description,
        thumbnailUrl: livepeerService.getThumbnailUrl(playbackId),
        playbackUrl: playbackUrl,
        duration: asset.videoSpec?.duration || 0,
        ipfsCid: cid, // Still store the full CID for reference
        uploadDate: timestamp,
        livepeerAssetId: asset.id,
        livepeerPlaybackId: playbackId,
      };
      
      console.log('[VideoServiceProvider] Video upload and transcoding process initiated');
      
      return videoInfo;
    } catch (error) {
      console.error('[VideoServiceProvider] Error in upload process:', error);
      throw error;
    }
  };
  
  /**
   * Get a playable URL for a video from IPFS CID
   */
  const getVideoUrl = (cid: string): string => {
    // Use the IPFS gateway URL
    return ipfsService.getGatewayUrlSync(cid);
  };
  
  /**
   * Get a Livepeer playback URL
   */
  const getPlaybackUrl = (playbackId: string): string => {
    if (!playbackId) {
      return '';
    }
    return livepeerService.getPlaybackUrl(playbackId);
  };
  
  /**
   * Load a video by ID. Handles both pure IPFS CIDs and our new composite IDs (CID-timestamp)
   */
  const loadVideoById = async (id: string): Promise<VideoInfo | null> => {
    if (!id) return null;
    
    // Check if this is already a full video info object (for example, passed from upload)
    if (typeof id === 'object' && (id as any).id) {
      return id as any as VideoInfo;
    }
    
    // Check if this is our composite ID format (CID-timestamp)
    // If so, extract the CID part
    let ipfsCid = id;
    let videoTitle = `Video ${id.substring(0, 8)}...`;
    
    // Check if ID contains a hyphen (our delimiter for composite IDs)
    if (id.includes('-')) {
      // Try to parse it as our composite format
      const parts = id.split('-');
      if (parts.length === 2) {
        // Attempt to reconstruct the full CID (we only store first 16 chars in the ID)
        const cidPart = parts[0];
        console.log(`[VideoServiceProvider] Parsing composite ID: ${id}, CID part: ${cidPart}`);
        
        try {
          // Try to load video metadata from backend first to get the full CID
          // If that fails, we'll use the partial CID from the ID
          ipfsCid = cidPart;
          videoTitle = `Video ${cidPart.substring(0, 8)}...`;
          
          // We could enhance this in the future to query the backend for full metadata
        } catch (error) {
          console.warn(`[VideoServiceProvider] Error retrieving metadata for ID ${id}:`, error);
        }
      }
    }
    
    try {
      // Try to fetch from IPFS without authorization header for public resources
      await ipfsService.fetchPublicResource(ipfsCid);
      
      // If successful, use the URL without authorization
      return {
        id,
        title: videoTitle,
        thumbnailUrl: '',
        playbackUrl: ipfsService.getGatewayUrlSync(ipfsCid),
        duration: 0,
        ipfsCid: ipfsCid,
        uploadDate: Date.now()
      } as VideoInfo;
    } catch (error) {
      console.warn(`[VideoServiceProvider] Error fetching public resource: ${error}`);
      // Fallback to regular URL
      return {
        id,
        title: videoTitle,
        thumbnailUrl: '',
        playbackUrl: ipfsService.getGatewayUrlSync(ipfsCid),
        duration: 0,
        ipfsCid: ipfsCid,
        uploadDate: Date.now()
      } as VideoInfo;
    }
  };
  
  /**
   * Determines if direct fallback from Livepeer to IPFS is allowed
   * based on beta mode setting
   */
  const isDirectFallbackAllowed = (): boolean => {
    // In beta mode, we allow direct fallback
    // Otherwise we keep trying with Livepeer
    return betaModeEnabled;
  };
  
  // Value for the context
  const contextValue: VideoServiceContextType = {
    isLoading,
    ipfsReady,
    livepeerReady,
    betaModeEnabled,
    uploadVideo,
    getVideoUrl,
    getPlaybackUrl,
    loadVideoById,
    isDirectFallbackAllowed
  };
  
  return (
    <VideoServiceContext.Provider value={contextValue}>
      {children}
    </VideoServiceContext.Provider>
  );
}

// Hook to use the video service
export function useVideoService() {
  const context = useContext(VideoServiceContext);
  
  if (!context) {
    throw new Error('useVideoService must be used within a VideoServiceProvider');
  }
  
  return context;
}
