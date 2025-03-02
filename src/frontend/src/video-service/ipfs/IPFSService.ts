import { PinataSDK } from 'pinata-web3';

/**
 * Service to handle IPFS video operations using Piñata SDK v0.5.4+
 */
export class IPFSService {
  // Actor reference for backend calls
  private static actorInstance: any = null;
  private static instance: IPFSService | null = null;
  private pinataSDK: PinataSDK | null = null;
  private gatewayDomain = 'salmon-worthy-hawk-798.mypinata.cloud';
  private pinataJWT = ''; // Will be set from environment

  /**
   * Get the singleton instance
   */
  public static getInstance(): IPFSService {
    if (!IPFSService.instance) {
      IPFSService.instance = new IPFSService();
    }
    return IPFSService.instance;
  }

  /**
   * Initialize the Piñata SDK
   */
  public async initialize(): Promise<void> {
    // If we've already initialized, skip
    if (this.pinataSDK) {
      return;
    }

    if (!this.pinataJWT) {
      console.warn('[IPFSService] Piñata JWT not configured. Please set your JWT with setPinataJWT().');
      return;
    }

    try {
      // Initialize the SDK with JWT
      this.pinataSDK = new PinataSDK({
        pinataJwt: this.pinataJWT,
        pinataGateway: this.gatewayDomain
      });

      console.log('[IPFSService] Piñata SDK initialized successfully');
      
      // Log the SDK structure for debugging
      console.log('[IPFSService] SDK structure:', Object.keys(this.pinataSDK));
      if ((this.pinataSDK as any).upload) {
        console.log('[IPFSService] Upload methods:', Object.keys((this.pinataSDK as any).upload));
      }
      
    } catch (error) {
      console.error('[IPFSService] Failed to initialize Piñata SDK:', error);
      throw error;
    }
  }

  /**
   * Upload a file to IPFS via modern Piñata SDK
   * @param file The file to upload
   * @returns The CID of the uploaded file
   */
  public async uploadFile(file: File): Promise<string> {
    try {
      console.log(`[IPFSService] Uploading file "${file.name}" (${file.size} bytes) to Piñata...`);

      // Make sure SDK is initialized
      if (!this.pinataSDK) {
        await this.initialize();
        if (!this.pinataSDK) {
          throw new Error('Piñata SDK not initialized. Please set your JWT in IPFSService.');
        }
      }
      
      // Use modern SDK structure for file upload
      if (!(this.pinataSDK as any).upload || typeof (this.pinataSDK as any).upload.file !== 'function') {
        throw new Error('Pinata SDK upload.file method not found. Make sure you are using pinata-web3 SDK v0.5.4+');
      }
      
      // Add metadata
      const result = await (this.pinataSDK as any).upload
        .file(file)
        .addMetadata({
          name: file.name,
          keyValues: {
            app: 'ShawtyFormVideo',
            type: 'video',
            timestamp: Date.now().toString(),
          }
        });
        
      const cid = result.IpfsHash;
      
      if (!cid) {
        throw new Error('Failed to get CID from Pinata upload response');
      }
      
      console.log('[IPFSService] File uploaded to Piñata with CID:', cid);
      return cid;
    } catch (error) {
      console.error('[IPFSService] Error uploading file to Piñata:', error);
      throw error;
    }
  }

  /**
   * Get a gateway URL for an IPFS CID using modern SDK
   * @param cid The CID of the file
   * @returns The URL of the file on Piñata's gateway
   */
  public async getGatewayUrl(cid: string): Promise<string> {
    if (!cid) return '';

    // Remove ipfs:// prefix if present
    if (cid.startsWith('ipfs://')) {
      cid = cid.substring(7);
    }

    if (this.pinataSDK) {
      try {
        // Use modern SDK structure
        if ((this.pinataSDK as any).gateway && typeof (this.pinataSDK as any).gateway.getAccessUrl === 'function') {
          return await (this.pinataSDK as any).gateway.getAccessUrl(`ipfs://${cid}`);
        }
        else if ((this.pinataSDK as any).gateway && typeof (this.pinataSDK as any).gateway.get === 'function') {
          return await (this.pinataSDK as any).gateway.get(`ipfs://${cid}`);
        }
      } catch (error) {
        console.warn('[IPFSService] Error getting URL from SDK, falling back to manual URL:', error);
      }
    }

    // Fallback to manual URL construction
    const baseUrl = `https://${this.gatewayDomain}/ipfs/${cid}`;
    
    // For public resources, we no longer need to include the JWT
    // This prevents CORS issues when accessing public IPFS content
    return baseUrl;
  }

  /**
   * Synchronous version of getGatewayUrl for backward compatibility
   * @param cid The CID of the file
   * @returns The URL of the file
   */
  public getGatewayUrlSync(cid: string): string {
    if (!cid) return '';

    // Remove ipfs:// prefix if present
    if (cid.startsWith('ipfs://')) {
      cid = cid.substring(7);
    }

    // Generate gateway URL without any async API calls
    const baseUrl = `https://${this.gatewayDomain}/ipfs/${cid}`;
    
    // Return the URL without auth for public resources
    return baseUrl;
  }

  /**
   * Get multiple gateway URLs for a CID
   * @param cid The CID of the file
   * @returns Array with Piñata's gateway URL
   */
  public getAllGatewayUrls(cid: string): string[] {
    if (!cid) return [];
    return [this.getGatewayUrlSync(cid)];
  }

  /**
   * Fetch data from IPFS gateway without Authorization header
   * Recommended for public resources to avoid CORS issues
   * @param cid The CID of the file to fetch
   * @returns Promise resolving to the fetched data
   */
  public async fetchPublicResource(cid: string): Promise<Response> {
    const url = await this.getGatewayUrl(cid);
    
    // Fetch without Authorization header for public resources
    return fetch(url, {
      method: 'GET',
      // No Authorization header for public resources
    });
  }

  /**
   * Test if Piñata is properly configured
   * @returns True if Piñata JWT is configured
   */
  public isPinataConfigured(): boolean {
    return Boolean(this.pinataJWT && this.pinataSDK);
  }

  /**
   * Set the Piñata JWT at runtime and initialize SDK
   * @param jwt The Piñata JWT to use
   */
  public async setPinataJWT(jwt: string): Promise<void> {
    if (!jwt || jwt.trim() === '') {
      console.error('[IPFSService] Invalid JWT provided - empty or undefined');
      throw new Error('Invalid Pinata JWT: Cannot be empty');
    }

    // Perform basic validation on the JWT format
    if (!jwt.includes('.') || jwt.length < 20) {
      console.error('[IPFSService] Invalid JWT format provided');
      throw new Error('Invalid Pinata JWT format: JWT should contain at least one dot and be longer than 20 characters');
    }

    this.pinataJWT = jwt;

    // If you have a custom gateway domain in your environment, set it
    const gatewayDomain = import.meta.env.VITE_GATEWAY_URL;
    if (gatewayDomain) {
      if (gatewayDomain.trim() === '') {
        console.warn('[IPFSService] Empty gateway domain provided, using default');
      } else {
        console.log(`[IPFSService] Using custom gateway domain: ${gatewayDomain}`);
        this.gatewayDomain = gatewayDomain;
      }
    } else {
      console.log(`[IPFSService] No custom gateway domain found, using default: ${this.gatewayDomain}`);
    }

    // Re-initialize the SDK with the new JWT
    return this.initialize();
  }

  /**
   * Set the backend actor instance for proxy calls
   * @param actor The canister actor instance
   */
  public static setActor(actor: any): void {
    IPFSService.actorInstance = actor;
    console.log('[IPFSService] Backend actor set for proxy requests');
  }

  /**
   * Check if the backend actor is available
   * @returns True if the actor is set
   */
  private static hasActor(): boolean {
    return !!IPFSService.actorInstance;
  }

  /**
   * Fetch IPFS content via the backend proxy to avoid CORS issues
   * @param cid IPFS CID to fetch
   * @returns Response with the content
   */
  public async fetchViaBackendProxy(cid: string): Promise<Response> {
    if (!IPFSService.hasActor()) {
      console.warn('[IPFSService] Backend actor not available for proxy request, falling back to direct fetch');
      return this.fetchPublicResource(cid);
    }

    try {
      console.log(`[IPFSService] Fetching IPFS content via backend proxy: ${cid}`);
      
      // Call backend proxy method
      const proxyResponse = await IPFSService.actorInstance.proxy_ipfs_content(cid);
      
      if ('Err' in proxyResponse) {
        const error = proxyResponse.Err;
        throw new Error(`Backend proxy error (${error.status_code}): ${error.message}`);
      }
      
      const result = proxyResponse.Ok;
      
      // Convert the binary data to a Blob with the correct content type
      const blob = new Blob([result.content], { type: result.content_type });
      
      // Create a synthetic Response object
      return new Response(blob, {
        status: result.status_code,
        headers: {
          'Content-Type': result.content_type,
          'Content-Length': String(result.content.length)
        }
      });
    } catch (error) {
      console.error('[IPFSService] Error fetching via backend proxy:', error);
      
      // If backend proxy fails, try to fall back to direct fetch
      console.log('[IPFSService] Attempting fallback to direct fetch after proxy failure');
      return this.fetchPublicResource(cid);
    }
  }

  /**
   * Get a proxy-compatible URL for a video
   * This doesn't actually return a URL but a special format that the player
   * will recognize to use the proxy
   * @param cid IPFS CID
   * @returns Special URL format for proxy use
   */
  public getProxyVideoUrl(cid: string): string {
    if (!cid) return '';
    
    // Remove ipfs:// prefix if present
    if (cid.startsWith('ipfs://')) {
      cid = cid.substring(7);
    }
    
    // Return a special URL format that will be recognized by our video player
    return `backend-proxy://${cid}`;
  }
}
