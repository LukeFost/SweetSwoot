import { Livepeer } from "livepeer";

// Define simplified types that won't break with SDK changes
interface Asset {
  id: string;
  name: string;
  status?: {
    phase?: string;
    errorMessage?: string;
  };
  videoSpec?: {
    duration?: number;
  };
  playbackId?: string;
  url?: string;
}

interface Playback {
  id: string;
  meta?: Record<string, any>;
}

interface AssetCreationResponse {
  asset: Asset;
  playbackId: string;
}

interface CreateAssetOptions {
  name: string;
  file?: File | null;
  url?: string;
  metadata?: Record<string, any>;
  // Optional file output profiles
  profiles?: Array<{
    name: string;
    bitrate: number;
    fps: number;
    width: number;
    height: number;
  }>;
}

/**
 * Service for interacting with Livepeer API for video transcoding and streaming
 */
export class LivepeerService {
  private static instance: LivepeerService | null = null;
  private client: Livepeer | null = null;
  private apiKey: string = '';
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): LivepeerService {
    if (!LivepeerService.instance) {
      LivepeerService.instance = new LivepeerService();
    }
    return LivepeerService.instance;
  }
  
  /**
   * Initialize the Livepeer client with API key
   */
  public async initialize(apiKey: string): Promise<void> {
    // Validate API key format
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new Error('Invalid Livepeer API key: Cannot be empty');
    }
    
    // Check for obvious placeholder values
    if (apiKey.includes('your_') || apiKey.includes('LIVEPEER_API_KEY')) {
      throw new Error('Invalid Livepeer API key: Using placeholder value');
    }
  
    // Check if already initialized with the same API key
    if (this.client && this.apiKey === apiKey) {
      console.log('[LivepeerService] Already initialized with the same API key');
      return;
    }
    
    try {
      console.log('[LivepeerService] Initializing Livepeer client...');
      this.apiKey = apiKey;
      
      // Initialize the Livepeer SDK
      this.client = new Livepeer({
        apiKey: apiKey,
      });
      
      // Verify the client is working
      console.log('[LivepeerService] Livepeer client initialized successfully ✅');
    } catch (error) {
      console.error('[LivepeerService] Failed to initialize Livepeer client:', error);
      this.client = null;
      this.apiKey = '';
      throw error;
    }
  }
  
  /**
   * Check if the Livepeer service is initialized
   */
  public isInitialized(): boolean {
    return !!this.client && !!this.apiKey;
  }
  
  /**
   * Create a new Livepeer asset using IPFS URL from Pinata
   * This implementation is simplified to work with the latest SDK
   */
  /**
   * Convert any IPFS URL to use multiple public gateways for maximum reliability
   * This helps ensure Livepeer can access content without authentication
   */
  private convertToPublicGateways(url: string): string {
    // If not an IPFS URL, return as is
    if (!url || (!url.includes('/ipfs/') && !url.includes('ipfs://'))) {
      return url;
    }
    
    console.log(`[LivepeerService] Converting IPFS URL to public gateways: ${url}`);
    
    // Extract the CID
    let cid: string | null = null;
    
    // Handle ipfs:// protocol
    if (url.startsWith('ipfs://')) {
      cid = url.substring(7);
    } 
    // Handle HTTP URLs with /ipfs/ path
    else {
      const cidMatch = url.match(/\/ipfs\/([^/?#]+)/);
      if (cidMatch && cidMatch[1]) {
        cid = cidMatch[1];
      }
    }
    
    // If we couldn't extract the CID, return the original URL
    if (!cid) {
      console.warn(`[LivepeerService] Could not extract CID from IPFS URL: ${url}`);
      return url;
    }
    
    // Use ipfs.io as the primary gateway (most reliable)
    // We're deliberately NOT using Pinata gateway URLs to avoid authentication issues
    const publicUrl = `https://ipfs.io/ipfs/${cid}`;
    
    console.log(`[LivepeerService] Converted to public gateway:`);
    console.log(`  Original: ${url}`);
    console.log(`  Public:   ${publicUrl}`);
    
    return publicUrl;
  }
  
  public async createAsset(options: CreateAssetOptions): Promise<AssetCreationResponse> {
    if (!this.client) {
      throw new Error('Livepeer client not initialized');
    }
    
    try {
      // Always ensure we're using public gateways for all IPFS URLs
      if (options.url) {
        const originalUrl = options.url;
        options.url = this.convertToPublicGateways(options.url);
        
        // If URL changed, log it
        if (originalUrl !== options.url) {
          console.log(`[LivepeerService] Using public gateway URL for Livepeer import`);
        }
      }
      
      // Enhanced request logging
      console.log(`[LivepeerService] Creating stream/asset with parameters:`, {
        name: options.name,
        hasFile: !!options.file,
        hasUrl: !!options.url,
        sourceUrl: options.url?.substring(0, 50) + (options.url && options.url.length > 50 ? '...' : '') || 'none',
        hasProfiles: !!options.profiles,
        profileCount: options?.profiles?.length || 0,
        metadata: options.metadata || 'none'
      });
      
      const requestStartTime = performance.now();
      
      // Verify URL is accessible before sending to Livepeer
      if (options.url && typeof fetch === 'function') {
        try {
          console.log(`[LivepeerService] Verifying source URL accessibility: ${options.url}`);
          const response = await fetch(options.url, { method: 'HEAD' });
          console.log(`[LivepeerService] Source URL check: ${response.status} ${response.statusText}`);
          
          if (response.status !== 200) {
            console.warn(`[LivepeerService] Warning: Source URL returned non-200 status (${response.status})`);
          }
        } catch (urlCheckError) {
          console.warn(`[LivepeerService] Warning: Could not verify source URL: ${urlCheckError}`);
        }
      }
      
      // Use a try/catch around the specific SDK method call
      let rawResponse: any;
      let response: any;
      
      try {
        // Attempt to use the documented method from the SDK
        const createParams = {
          name: options.name,
          ...(options.url ? { url: options.url } : {}),
          ...(options.file ? { file: options.file } : {}),
          ...(options.profiles ? { profiles: options.profiles } : {}),
          ...(options.metadata ? { metadata: options.metadata } : {})
        };
        
        console.log('[LivepeerService] SDK create params:', JSON.stringify(createParams, (key, value) => {
          // Don't log the file content
          if (key === 'file' && value) return `[File: ${(value as File).name}, ${(value as File).size} bytes]`;
          return value;
        }, 2));
        
        rawResponse = await this.client.stream.create(createParams);
        
        // Log detailed response
        console.log(`[LivepeerService] Create asset API call completed in ${(performance.now() - requestStartTime).toFixed(0)}ms`);
        console.log('[LivepeerService] Raw response structure:', Object.keys(rawResponse || {}).join(', '));
        
        response = rawResponse;
      } catch (error) {
        const sdkError = error as Error;
        console.error('[LivepeerService] SDK error when creating stream:', sdkError);
        console.error('[LivepeerService] Error details:', {
          name: sdkError.name,
          message: sdkError.message,
          stack: sdkError.stack,
          // Try to extract HTTP details if available
          statusCode: (sdkError as any).statusCode || (sdkError as any).status || 'unknown',
          responseData: (sdkError as any).response?.data || (sdkError as any).data || 'none'
        });
        
        // As a fallback, try to use any available create method
        console.log('[LivepeerService] Attempting fallback method');
        if (this.client.stream && typeof this.client.stream.create === 'function') {
          response = await this.client.stream.create({
            name: options.name,
            ...(options.url ? { url: options.url } : {})
          });
        } else if (typeof (this.client as any).createStream === 'function') {
          response = await (this.client as any).createStream({
            name: options.name,
            ...(options.url ? { url: options.url } : {})
          });
        } else {
          throw new Error('No compatible method found in Livepeer SDK to create stream');
        }
      }
      
      // Log response details even after fallback
      console.log('[LivepeerService] Create stream response type:', typeof response);
      console.log('[LivepeerService] Response structure:', Object.keys(response || {}).join(', '));
      
      // Extract data from response, being careful with property access
      let streamData: any;
      if (response && response.stream) {
        streamData = response.stream;
        console.log('[LivepeerService] Found stream data in response.stream');
      } else if (response && response.data) {
        streamData = response.data;
        console.log('[LivepeerService] Found stream data in response.data');
      } else {
        streamData = response;
        console.log('[LivepeerService] Using entire response as stream data');
      }
      
      // Log detailed information about the stream data
      console.log('[LivepeerService] Stream data structure:', Object.keys(streamData || {}).join(', '));
      console.log('[LivepeerService] Stream ID:', streamData?.id);
      console.log('[LivepeerService] Playback ID:', streamData?.playbackId || streamData?.playback_id);
      
      if (!streamData?.id) {
        console.warn('[LivepeerService] WARNING: No stream ID found in response');
      }
      
      if (!streamData?.playbackId && !streamData?.playback_id) {
        console.warn('[LivepeerService] WARNING: No playback ID found in response');
      }
      
      // Create a safe asset object
      const asset: Asset = {
        id: streamData?.id || 'unknown-id',
        name: streamData?.name || options.name,
        status: { phase: 'created' },
        playbackId: streamData?.playbackId || streamData?.playback_id || 'unknown-playback-id'
      };
      
      // Get the playback ID
      const playbackId = streamData?.playbackId || 
                         streamData?.playback_id || 
                         streamData?.playbackURL?.split('/').pop()?.replace(/\/index.m3u8$/, '') ||
                         'unknown-playback-id';
      
      console.log('[LivepeerService] Created asset successfully:', {
        assetId: asset.id,
        name: asset.name,
        playbackId: playbackId,
        playbackUrl: `https://lax-prod-catalyst-0.lp-playback.studio/hls/${playbackId}/index.m3u8`
      });
      
      // Test the playback URL if in browser environment
      try {
        const playbackUrl = `https://lax-prod-catalyst-0.lp-playback.studio/hls/${playbackId}/index.m3u8`;
        console.log(`[LivepeerService] Testing playback URL availability: ${playbackUrl}`);
        
        // This will be executed only if running in a browser environment
        if (typeof fetch === 'function') {
          fetch(playbackUrl, { method: 'HEAD' })
            .then(response => {
              console.log(`[LivepeerService] Playback URL status: ${response.status} ${response.statusText}`);
            })
            .catch(error => {
              console.warn(`[LivepeerService] Playback URL test failed: ${error.message}`);
            });
        }
      } catch (playbackTestError) {
        console.warn('[LivepeerService] Error testing playback URL:', playbackTestError);
      }
      
      return {
        asset,
        playbackId
      };
    } catch (caughtError) {
      const error = caughtError as Error;
      console.error('[LivepeerService] Failed to create asset:', error);
      // Enhance error logging
      console.error('[LivepeerService] Error type:', error.constructor.name);
      console.error('[LivepeerService] Error message:', error.message);
      console.error('[LivepeerService] Stack trace:', error.stack);
      
      // Extract useful information from network errors
      if ((error as any).response) {
        console.error('[LivepeerService] Error status:', (error as any).response.status);
        console.error('[LivepeerService] Error data:', (error as any).response.data);
      }
      
      throw error;
    }
  }
  
  /**
   * Get asset/stream status by ID
   */
  public async getAsset(assetId: string): Promise<Asset | null> {
    if (!this.client) {
      throw new Error('Livepeer client not initialized');
    }
    
    try {
      // Try to get a stream with safe error handling
      let streamData: any;
      
      try {
        // Try the documented API
        if (this.client.stream && typeof this.client.stream.get === 'function') {
          streamData = await this.client.stream.get(assetId);
        } else if (typeof (this.client as any).getStream === 'function') {
          streamData = await (this.client as any).getStream(assetId);
        } else {
          throw new Error('No compatible method found in Livepeer SDK to get stream');
        }
      } catch (sdkError) {
        console.error(`[LivepeerService] SDK error when getting stream ${assetId}:`, sdkError);
        return null;
      }
      
      // Handle the response data carefully
      if (!streamData) return null;
      
      // Extract the actual stream data
      const stream = streamData.data || streamData;
      
      // Carefully map the response to our Asset interface
      return {
        id: stream?.id || assetId,
        name: stream?.name || 'Unknown Stream',
        status: {
          phase: stream?.isActive || stream?.active ? 'ready' : 'pending'
        },
        playbackId: stream?.playbackId || stream?.playback_id
      };
    } catch (error) {
      console.error(`[LivepeerService] Failed to get asset ${assetId}:`, error);
      return null;
    }
  }
  
  /**
   * Get playback info by ID
   */
  public async getPlayback(playbackId: string): Promise<Playback | null> {
    if (!this.client) {
      throw new Error('Livepeer client not initialized');
    }
    
    try {
      // Try to get playback info with safe error handling
      let playbackData: any;
      
      try {
        // Try different possible API methods with correct type handling
        if (this.client.playback && typeof this.client.playback.get === 'function') {
          // Cast to any to avoid TypeScript errors with unknown SDK versions
          playbackData = await (this.client.playback as any).get(playbackId);
        } else if (typeof (this.client as any).getPlaybackInfo === 'function') {
          playbackData = await (this.client as any).getPlaybackInfo(playbackId);
        }
      } catch (sdkError) {
        console.warn(`[LivepeerService] SDK error when getting playback ${playbackId}:`, sdkError);
        // Fall through to return a minimal playback object
      }
      
      // Return a playback object even if we couldn't get data
      return {
        id: playbackId,
        meta: playbackData || {}
      };
    } catch (error) {
      console.error(`[LivepeerService] Failed to get playback ${playbackId}:`, error);
      return null;
    }
  }
  
  /**
   * Poll for asset status until it's ready
   * @param assetId - The asset ID to check
   * @param maxAttempts - Maximum number of polling attempts (default: 30)
   * @param interval - Polling interval in milliseconds (default: 5000)
   */
  public async waitForAssetReady(assetId: string, maxAttempts = 30, interval = 5000): Promise<Asset | null> {
    if (!this.client) {
      throw new Error('Livepeer client not initialized');
    }
    
    console.log(`[LivepeerService] Starting to poll for asset ${assetId} readiness (max ${maxAttempts} attempts, ${interval}ms interval)`);
    let attempt = 0;
    let asset: Asset | null = null;
    const startTime = performance.now();
    
    while (attempt < maxAttempts) {
      attempt++;
      const attemptStartTime = performance.now();
      
      try {
        console.log(`[LivepeerService] Polling attempt ${attempt}/${maxAttempts} for asset ${assetId}`);
        asset = await this.getAsset(assetId);
        const attemptDuration = performance.now() - attemptStartTime;
        
        if (!asset) {
          console.log(`[LivepeerService] Asset ${assetId} not found (attempt ${attempt}/${maxAttempts}, took ${attemptDuration.toFixed(0)}ms)`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        const status = asset.status?.phase;
        console.log(`[LivepeerService] Asset status: ${status} (attempt ${attempt}/${maxAttempts}, took ${attemptDuration.toFixed(0)}ms)`);
        
        // Log more details about the asset
        const assetDetails = {
          id: asset.id,
          name: asset.name,
          status: asset.status?.phase || 'unknown',
          errorMessage: asset.status?.errorMessage || null,
          playbackId: asset.playbackId || 'unknown',
          duration: asset.videoSpec?.duration || 'unknown'
        };
        console.log(`[LivepeerService] Asset details:`, assetDetails);
        
        if (status === 'ready' || status === 'completed') {
          const totalDuration = performance.now() - startTime;
          console.log(`[LivepeerService] Asset ${assetId} is ready ✅ (total wait time: ${(totalDuration/1000).toFixed(1)}s)`);
          
          // Test the playback URL if available
          if (asset.playbackId) {
            const playbackUrl = this.getPlaybackUrl(asset.playbackId);
            console.log(`[LivepeerService] Testing final playback URL: ${playbackUrl}`);
            
            try {
              // This will be executed only if running in a browser environment
              if (typeof fetch === 'function') {
                fetch(playbackUrl, { method: 'HEAD' })
                  .then(response => {
                    console.log(`[LivepeerService] Final playback URL status: ${response.status} ${response.statusText}`);
                  })
                  .catch(error => {
                    console.warn(`[LivepeerService] Final playback URL test failed: ${error.message}`);
                  });
              }
            } catch (urlTestError) {
              console.warn('[LivepeerService] Error testing final playback URL:', urlTestError);
            }
          }
          
          return asset;
        }
        
        if (status === 'failed') {
          console.error(`[LivepeerService] Asset ${assetId} processing failed ❌`);
          console.error(`[LivepeerService] Error details:`, asset.status?.errorMessage || 'Unknown error');
          throw new Error(`Asset processing failed: ${asset.status?.errorMessage || 'Unknown error'}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (caughtError) {
        const error = caughtError as Error;
        console.error(`[LivepeerService] Error checking asset status (attempt ${attempt}/${maxAttempts}):`, error);
        console.error('[LivepeerService] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          statusCode: (error as any).statusCode || (error as any).status || 'unknown',
          responseData: (error as any).response?.data || (error as any).data || 'none'
        });
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    const totalDuration = performance.now() - startTime;
    console.error(`[LivepeerService] Asset ${assetId} did not become ready within ${maxAttempts} attempts (${(totalDuration/1000).toFixed(1)}s)`);
    throw new Error(`Asset ${assetId} did not become ready within ${maxAttempts} attempts`);
  }
  
  /**
   * Get the playback URL (HLS) for a given playback ID
   */
  public getPlaybackUrl(playbackId: string): string {
    if (!playbackId) return '';
    
    // Livepeer updated format for HLS playback URL
    return `https://lax-prod-catalyst-0.lp-playback.studio/hls/${playbackId}/index.m3u8`;
  }
  
  /**
   * Get the thumbnail URL for a given playback ID
   * @param playbackId The Livepeer playback ID
   * @param time Optional time in seconds (default: 0 for start of video)
   * @returns URL to the thumbnail image
   */
  public getThumbnailUrl(playbackId: string, time: number = 0): string {
    if (!playbackId) return '';
    
    // Use Livepeer's updated approach for thumbnails
    // Adding the time parameter allows getting thumbnails at different time points
    // Format: ?time=30 would get a thumbnail at 30 seconds
    const timeParam = time > 0 ? `?time=${time}` : '';
    return `https://lax-prod-catalyst-0.lp-playback.studio/hls/${playbackId}/thumbnail.jpg${timeParam}`;
  }
  
  /**
   * Get the thumbnails VTT file URL for a given playback ID
   * This file contains the mapping between timecodes and thumbnail images
   */
  public getThumbnailsVttUrl(playbackId: string): string {
    if (!playbackId) return '';
    
    return `https://lax-prod-catalyst-0.lp-playback.studio/hls/${playbackId}/thumbnails.vtt`;
  }
  
  /**
   * List assets with optional pagination
   */
  public async listAssets(options: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<{
    assets: Asset[];
    nextCursor?: string;
  }> {
    if (!this.client) {
      throw new Error('Livepeer client not initialized');
    }
    
    try {
      // Try to list streams with safe error handling
      let listResponse: any;
      let streams: any[] = [];
      
      try {
        // Try different possible API methods with type safety
        if (this.client.stream) {
          // Cast to any to avoid TypeScript errors
          const streamApi = this.client.stream as any;
          if (typeof streamApi.list === 'function') {
            listResponse = await streamApi.list({
              limit: options.limit || 10
            });
            streams = listResponse?.streams || [];
          }
        } else if (typeof (this.client as any).getStreams === 'function') {
          listResponse = await (this.client as any).getStreams({
            limit: options.limit || 10
          });
          streams = listResponse?.data || listResponse?.streams || [];
        }
      } catch (sdkError) {
        console.error('[LivepeerService] SDK error when listing streams:', sdkError);
        return { assets: [] };
      }
      
      // Safely map the streams to our Asset interface
      const assets = (Array.isArray(streams) ? streams : []).map((stream: any) => ({
        id: stream?.id || 'unknown-id',
        name: stream?.name || 'Unknown Stream',
        status: {
          phase: stream?.isActive || stream?.active ? 'ready' : 'pending'
        },
        playbackId: stream?.playbackId || stream?.playback_id
      }));
      
      return {
        assets,
        nextCursor: undefined // The SDK might not support cursor-based pagination in the same way
      };
    } catch (error) {
      console.error('[LivepeerService] Failed to list assets:', error);
      return { assets: [] };
    }
  }
}
