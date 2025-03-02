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

import { ReactNode, useEffect } from "react";
import { _SERVICE } from "../../../backend/declarations/backend.did";
import toast from "react-hot-toast";
import { useSiwe } from "ic-siwe-js/react";
import { IPFSService } from "../video-service/ipfs/IPFSService";

const actorContext = createActorContext<_SERVICE>();
const useActorBase = createUseActorHook<_SERVICE>(actorContext);

// Create caching variables to store our actor proxy and the actor it was created from
// This prevents "Cannot access 'S' before initialization" error
let cachedActorProxy: any = null;
let cachedActorSource: any = null;

// Create a wrapper that automatically accesses the nested actor
export const useActor = () => {
  // Get the base actor
  const actor = useActorBase();
  
  if (!actor) return null;

  // If we already have a cached actor proxy and it's for the same actor instance, return it
  if (cachedActorProxy && cachedActorSource === actor) {
    return cachedActorProxy;
  }
  
  // Store the current actor for future comparisons
  cachedActorSource = actor;

  // Log diagnostic information
  console.log('Actor object:', actor);
  
  // Log the actor structure
  console.log('Actor structure:', Object.keys(actor));
  
  // Special debug for nested actor
  if (actor.actor) {
    console.log('Nested actor structure:', Object.keys(actor.actor));
    
    // Check specifically for list_all_videos
    if (typeof actor.actor.list_all_videos === 'function') {
      console.log('✅ list_all_videos found on actor.actor');
    } else {
      console.log('❌ list_all_videos NOT found on actor.actor');
    }
  } else {
    console.log('No nested actor.actor property found');
  }
  
  // Also check on main actor
  // @ts-ignore - we're checking if it exists
  if (typeof actor.list_all_videos === 'function') {
    console.log('✅ list_all_videos found directly on actor');
  } else {
    console.log('❌ list_all_videos NOT found directly on actor');
  }

  // Use a stable proxy to avoid dependencies changing in useEffect hooks
  // Create the proxy and store it in the cache
  cachedActorProxy = new Proxy(actor, {
    get(target, prop, receiver) {
      if (typeof prop === 'string') {
        console.log(`Attempting to access method: ${String(prop)}`);
      }
      
      // Direct methods from the candid interface - our top priority
      if (prop === 'list_all_videos' || prop === 'list_videos_by_tag') {
        console.log(`Looking for direct method: ${String(prop)}`);
        
        // Look in the target first (main object)
        const directMethod = Reflect.get(target, prop, receiver);
        if (typeof directMethod === 'function') {
          console.log(`Found ${String(prop)} directly on actor`);
          return directMethod.bind(target);
        }
        
        // Then try the actor property if it exists
        if (target.actor) {
          try {
            // @ts-ignore - using dynamic property access
            const nestedMethod = target.actor[prop as any];
            if (typeof nestedMethod === 'function') {
              console.log(`Found ${String(prop)} on nested actor.actor`);
              return nestedMethod.bind(target.actor);
            }
          } catch (e) {
            console.error(`Error accessing ${String(prop)} on nested actor:`, e);
          }
        }
      }
      
      // Allow direct access to the actor property
      if (prop === 'actor') {
        return Reflect.get(target, prop, receiver);
      }
      
      // First check if prop exists directly on the actor
      const directValue = Reflect.get(target, prop, receiver);
      if (directValue !== undefined && directValue !== null) {
        if (typeof directValue === 'function') {
          console.log(`Using direct method: ${String(prop)}`);
          return directValue.bind(target);
        }
        return directValue;
      }
      
      // If not found, look for the method on the target.actor property
      if (target.actor && typeof prop === 'string') {
        try {
          // @ts-ignore - using dynamic property access
          const nestedValue = target.actor[prop as any];
          if (typeof nestedValue === 'function') {
            console.log(`Accessing nested method: ${String(prop)}`);
            return nestedValue.bind(target.actor);
          }
        } catch (e) {
          console.error(`Error accessing ${String(prop)} on nested actor:`, e);
        }
        
        // Try snake_case conversion as fallback (camelCase -> snake_case)
        const snakeCaseProp = prop.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (snakeCaseProp !== prop) {
          try {
            // @ts-ignore - using dynamic property access
            const snakeCaseMethod = target.actor[snakeCaseProp as any];
            if (typeof snakeCaseMethod === 'function') {
              console.log(`Mapping ${String(prop)} to ${snakeCaseProp}`);
              return snakeCaseMethod.bind(target.actor);
            }
          } catch (e) {
            console.error(`Error accessing ${snakeCaseProp} on actor:`, e);
          }
        }
      }
      
      // Log if we couldn't find a method to help with debugging
      if (typeof prop === 'string' && prop !== 'toJSON' && prop !== 'then') {
        console.warn(`Method not found: ${String(prop)}`);
      }
      
      // Return undefined for anything not found
      return undefined;
    }
  });
  
  // Return the cached proxy
  return cachedActorProxy;
};

export default function Actors({ children }: { children: ReactNode }) {
  const { identity, clear } = useSiwe();
  const actor = useActor();
  
  console.log('Actors component initializing with canisterId:', canisterId);
  // Log the current network for debugging
  const network = process.env.DFX_NETWORK || 'local';
  console.log('Current DFX network:', network);
  
  // Register the actor with the IPFS service to enable proxy requests
  useEffect(() => {
    if (actor) {
      IPFSService.setActor(actor);
    }
  }, [actor]);

  const errorToast = (error: unknown) => {
    if (typeof error === "object" && error !== null && "message" in error) {
      toast.error(error.message as string, {
        position: "bottom-right",
      });
    }
  };

  const handleResponseError = (data: InterceptorErrorData) => {
    console.error("onResponseError", data.error);
    
    // Handle identity expiration
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
    
    // Check for specific IC canister errors that we want to handle specially
    const errorStr = String(data.error);
    if (errorStr.includes("time not implemented on this platform")) {
      console.warn("Backend canister time function error - this is expected in local development");
      // Don't show an error toast for time-related errors as they're expected in dev
      return;
    }
    
    // Show error toast for other types of errors
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
