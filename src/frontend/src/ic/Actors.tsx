/* eslint-disable react-refresh/only-export-components */
import {
  ActorProvider,
  InterceptorErrorData,
  InterceptorRequestData,
  createActorContext,
  createUseActorHook,
  isIdentityExpiredError,
} from "ic-use-actor";
// Import directly from the correct paths
import { idlFactory } from "../../../backend/declarations/backend.did.js";
import { canisterId } from "../../../backend/declarations/index.js";
console.log('Backend canister ID:', canisterId);

import { ReactNode } from "react";
import { _SERVICE } from "../../../backend/declarations/backend.did";
import toast from "react-hot-toast";
import { useSiwe } from "ic-siwe-js/react";

const actorContext = createActorContext<_SERVICE>();
// We're keeping this for when we switch back to real IC backend
// @ts-ignore - We need this for production but not using it in development
const useActorBase = createUseActorHook<_SERVICE>(actorContext);

// Create a wrapper that automatically accesses the nested actor
export const useActor = () => {
  // We're not using the real actor in development mode
  // const actor = useActorBase(); // Commented out to avoid unused variable warning
  
  // Create a mock actor for development
  const mockActor = {
    actor: {
      // Mock implementation of list_all_videos
      list_all_videos: async (): Promise<any[]> => {
        console.log('Using mock list_all_videos implementation');
        try {
          const response = await fetch('http://localhost:55662/api/videos');
          const data = await response.json();
          console.log('Mock backend returned videos:', data);
          return data;
        } catch (error) {
          console.error('Error fetching from mock backend:', error);
          return [];
        }
      },
      
      // Mock implementation of list_videos_by_tag
      list_videos_by_tag: async (tag: string): Promise<any[]> => {
        console.log('Using mock list_videos_by_tag implementation with tag:', tag);
        try {
          const response = await fetch(`http://localhost:55662/api/videos/tag/${tag}`);
          const data = await response.json();
          console.log('Mock backend returned videos for tag:', data);
          return data;
        } catch (error) {
          console.error('Error fetching from mock backend:', error);
          return [];
        }
      },
      
      // Mock implementation of get_video_metadata
      getVideoMetadata: async (videoId: string): Promise<any> => {
        console.log('Using mock getVideoMetadata implementation with ID:', videoId);
        try {
          const response = await fetch(`http://localhost:55662/api/videos/${videoId}`);
          const data = await response.json();
          console.log('Mock backend returned video metadata:', data);
          return data;
        } catch (error) {
          console.error('Error fetching from mock backend:', error);
          return { Err: 'Failed to fetch video metadata' };
        }
      },
      
      // Mock implementation of create_video_metadata
      create_video_metadata: async (
        videoId: string, 
        title: string, 
        tags: string[], 
        storageRef: string[] | []
      ): Promise<any> => {
        console.log('Using mock create_video_metadata implementation');
        console.log('Parameters:', { videoId, title, tags, storageRef });
        
        try {
          const response = await fetch('http://localhost:55662/api/videos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              tags,
              storage_ref: storageRef && storageRef.length > 0 ? storageRef[0] : null
            }),
          });
          
          const data = await response.json();
          console.log('Mock backend created video:', data);
          return data;
        } catch (error) {
          console.error('Error creating video in mock backend:', error);
          return { Err: 'Failed to create video metadata' };
        }
      },
      
      // Add other mock methods as needed
      logWatchEvent: async (): Promise<{ Ok: null }> => {
        console.log('Mock logWatchEvent called');
        return { Ok: null };
      }
    }
  };
  
  console.log('Using mock actor for development');
  return mockActor;
};

export default function Actors({ children }: { children: ReactNode }) {
  const { identity, clear } = useSiwe();
  
  console.log('Actors component initializing with canisterId:', canisterId);
  // Log the current network for debugging
  const network = process.env.DFX_NETWORK || 'local';
  console.log('Current DFX network:', network);

  const errorToast = (error: unknown) => {
    if (typeof error === "object" && error !== null && "message" in error) {
      toast.error(error.message as string, {
        position: "bottom-right",
      });
    }
  };

  const handleResponseError = (data: InterceptorErrorData) => {
    console.error("onResponseError", data.error);
    if (isIdentityExpiredError(data.error)) {
      toast.error("Login expired.", {
        id: "login-expired",
        position: "bottom-right",
      });
      setTimeout(() => {
        clear(); // Clears the identity from the state and local storage. Effectively "logs the user out".
        window.location.reload(); // Reload the page to reset the UI.
      }, 1000);
      return;
    }

    if (typeof data === "object" && data !== null && "message" in data) {
      errorToast(data);
    }
  };

  const handleRequest = (data: InterceptorRequestData) => {
    console.log("onRequest", data.args, data.methodName);
    return data.args;
  };

  return (
    <ActorProvider<_SERVICE>
      canisterId={canisterId}
      context={actorContext}
      identity={identity}
      idlFactory={idlFactory}
      onRequest={handleRequest}
      onRequestError={(error) => errorToast(error)}
      onResponseError={handleResponseError}
    >
      {children}
    </ActorProvider>
  );
}
