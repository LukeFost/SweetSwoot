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
const useActorBase = createUseActorHook<_SERVICE>(actorContext);

// Create a wrapper that automatically accesses the nested actor
export const useActor = () => {
  const actor = useActorBase();
  
  if (!actor) return null;

  // Log diagnostic information
  console.log('Actor object:', actor);
  
  // Return a proxy that automatically tries the actor.actor property
  // Check if we have a valid actor to return first
  if (!actor) {
    console.warn('Actor is null or undefined');
    return null;
  }
  
  // Log the actor structure but don't do it too often
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
  return new Proxy(actor, {
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
