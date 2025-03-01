/* eslint-disable react-refresh/only-export-components */
import {
  ActorProvider,
  InterceptorErrorData,
  InterceptorRequestData,
  createActorContext,
  createUseActorHook,
  isIdentityExpiredError,
} from "ic-use-actor";
// Import from the generated index file which has the correct canister ID
import { canisterId, idlFactory } from "../../../backend/declarations/index";
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
  return new Proxy(actor, {
    get(target, prop, receiver) {
      // Allow direct access to the actor property
      if (prop === 'actor') {
        return Reflect.get(target, prop, receiver);
      }
      
      // First check if prop exists directly on the actor
      const directValue = Reflect.get(target, prop, receiver);
      if (directValue !== undefined) {
        return directValue;
      }
      
      // If not, check if it exists on the nested actor property
      if (target.actor && typeof prop === 'string') {
        const nestedValue = target.actor[prop];
        if (typeof nestedValue === 'function') {
          console.log(`Accessing nested method: ${String(prop)}`);
          return nestedValue.bind(target.actor);
        }
      }
      
      // Return undefined for anything not found
      return undefined;
    }
  });
};

export default function Actors({ children }: { children: ReactNode }) {
  const { identity, clear } = useSiwe();

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
