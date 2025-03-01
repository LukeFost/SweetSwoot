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
  get_video_metadata: (videoId: string) => Promise<any>;
  create_video_metadata: (videoId: string, title: string, tags: string[], storageRef: string[]) => Promise<any>;
  // Note: list_all_videos is directly available on the actor object; don't use it here
  list_videos_by_tag: (tag: string) => Promise<any[]>;
  log_watch_event: (videoId: string, duration: number, liked: boolean, completed: boolean) => Promise<any>;
  // Additional backend methods needed for our new components
  get_comments: (videoId: string) => Promise<any[]>;
  post_comment: (videoId: string, text: string) => Promise<any>;
  list_profiles: () => Promise<any>; // Changed from list_all_profiles which doesn't exist
  get_video_analytics: (videoId: string) => Promise<any>;
  // Tip-related methods
  record_tip: (videoId: string, amount: bigint, txHash: string) => Promise<any>;
  get_tips_for_video: (videoId: string) => Promise<any[]>;
  get_my_sent_tips: () => Promise<any[]>;
  get_my_received_tips: () => Promise<any[]>;
  // Follow-related methods
  follow_user: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  unfollow_user: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  get_followers: (principal: Principal) => Promise<Principal[]>;
  get_following: (principal: Principal) => Promise<Principal[]>;
  is_following: (follower: Principal, followed: Principal) => Promise<boolean>;
}