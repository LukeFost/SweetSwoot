// Type definitions for our LivePeer client
import { Principal } from '@dfinity/principal';

export interface PlaybackInfo {
  meta?: {
    source?: Array<{
      type: string;
      url: string;
    }>;
  };
}

export interface AssetUploadResponse {
  id: string;
  name: string;
  playbackId: string;
  status: string;
  userId: string;
  createdAt: string;
}

export interface LivepeerClient {
  apiKey: string;
  baseUrl: string;
  request: (endpoint: string, options?: RequestInit) => Promise<any>;
  getPlaybackInfo: (playbackId: string) => Promise<PlaybackInfo>;
  uploadVideo: (
    file: File,
    name: string,
    onProgress?: (progress: number) => void
  ) => Promise<AssetUploadResponse>;
}

// User profile for the application
export interface UserProfile {
  evm_address: string;
  name: string;
  avatar_url: string;
  principal?: string;
}

// Extended backend service interface to make TypeScript happy
export interface BackendExtended {
  getVideoMetadata: (videoId: string) => Promise<any>;
  createVideoMetadata: (videoId: string, title: string, tags: string[], storageRef: string[]) => Promise<any>;
  // Note: listAllVideos is directly available on the actor object; don't use it here
  listVideosByTag: (tag: string) => Promise<any[]>;
  logWatchEvent: (videoId: string, duration: number, liked: boolean, completed: boolean) => Promise<any>;
  // Additional backend methods needed for our new components
  getComments: (videoId: string) => Promise<any[]>;
  postComment: (videoId: string, text: string) => Promise<any>;
  listProfiles: () => Promise<any>; // Changed from list_all_profiles which doesn't exist
  getVideoAnalytics: (videoId: string) => Promise<any>;
  // Tip-related methods
  recordTip: (videoId: string, amount: bigint, txHash: string) => Promise<any>;
  getTipsForVideo: (videoId: string) => Promise<any[]>;
  getMySentTips: () => Promise<any[]>;
  getMyReceivedTips: () => Promise<any[]>;
  // Follow-related methods
  followUser: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  unfollowUser: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  getFollowers: (principal: Principal) => Promise<Principal[]>;
  getFollowing: (principal: Principal) => Promise<Principal[]>;
  isFollowing: (follower: Principal, followed: Principal) => Promise<boolean>;
}