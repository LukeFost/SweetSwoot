import { ReactNode, createContext, useContext, useMemo } from 'react';
import { LivepeerClient, PlaybackInfo, AssetUploadResponse } from './types';

// Create a context for the Livepeer client
const LivepeerContext = createContext<LivepeerClient | null>(null);

// Hook to use the livepeer client
export const useLivepeer = () => {
  const context = useContext(LivepeerContext);
  if (!context) {
    throw new Error('useLivepeer must be used within a LivepeerProvider');
  }
  return context;
};

interface LivepeerProviderProps {
  children: ReactNode;
}

// Implementation of LivepeerClient that uses direct API calls
// This approach is necessary until we move API calls to the backend
export const createLivepeerClient = (apiKey: string): LivepeerClient => ({
  apiKey,
  baseUrl: 'https://livepeer.studio/api',

  // Helper to make API requests
  async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Remove Content-Type header for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LivePeer API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    return response.json();
  },

  // Get playback info for a video
  async getPlaybackInfo(playbackId: string): Promise<PlaybackInfo> {
    try {
      return await this.request(`/playback/${playbackId}`);
    } catch (error) {
      console.error("Error fetching playback info:", error);
      // Return a minimal structure to allow the player to attempt direct playback
      return { meta: { source: [] } };
    }
  },

  // Upload a video and get asset details
  // Note: This direct approach isn't recommended for production and will likely
  // face CORS issues, but we're keeping it for now for development simplicity
  async uploadVideo(file: File, name: string, onProgress?: (progress: number) => void): Promise<AssetUploadResponse> {
    try {
      console.log("Starting upload process for", name, "...");
      
      if (onProgress) {
        onProgress(0.1); // Initial progress indicator
      }
      
      // Create a form for the file upload
      const formData = new FormData();
      formData.append('file', file);
      
      if (name) {
        formData.append('name', name);
      }

      // Standard direct upload - may face CORS issues
      // Ideally this should be done via backend proxy
      const asset = await this.request('/asset/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (onProgress) {
        onProgress(1.0);
      }
      
      console.log("Upload completed successfully:", asset);
      return asset;
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error(`LivePeer upload error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

// Create a client instance using the API key from environment
export const livepeerClient = createLivepeerClient(import.meta.env.VITE_LIVEPEER_API_KEY || '');

// Provider component that makes the Livepeer client available
export function LivepeerProvider({ children }: LivepeerProviderProps) {
  // Create a stable client instance
  const client = useMemo(() => 
    livepeerClient, 
    []
  );

  return (
    <LivepeerContext.Provider value={client}>
      {children}
    </LivepeerContext.Provider>
  );
}