/**
 * Utility functions for interacting with the backend
 */

/**
 * Helper function for JSON stringify with BigInt support
 * @param _key - The key of the property being stringified (unused but required by JSON.stringify)
 * @param value - The value to stringify
 * @returns The value converted to a format JSON can handle
 */
export function bigintReplacer(_key: string, value: any): any {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Safely stringify an object that may contain BigInt values
 * @param obj - The object to stringify
 * @returns A JSON string with BigInt values converted to strings
 */
export function safeStringify(obj: any): string {
  return JSON.stringify(obj, bigintReplacer);
}

/**
 * Get all videos from the backend
 * This function handles the naming discrepancy between backend and frontend
 */
export async function getAllVideos(actor: any) {
  if (!actor) {
    throw new Error("Actor is not available");
  }

  // Debug available methods
  console.log('Actor methods:', Object.getOwnPropertyNames(actor));
  
  // Output some debug information to help understand what's going on
  console.log('Actor prototype chain:');
  let prototype = Object.getPrototypeOf(actor);
  let level = 0;
  while (prototype) {
    console.log(`Level ${level++}:`, Object.getOwnPropertyNames(prototype));
    prototype = Object.getPrototypeOf(prototype);
  }

  // Try accessing the actual methods to see what's going on
  console.log('Direct property access:');
  try {
    console.log('actor["list_all_videos"] =', actor["list_all_videos"]);
  } catch (e) {
    console.log('Error accessing list_all_videos:', e);
  }
  
  try {
    console.log('actor["listAllVideos"] =', actor["listAllVideos"]);
  } catch (e) {
    console.log('Error accessing listAllVideos:', e);
  }
  
  // First try direct method call via apply to bypass property lookup issues
  try {
    console.log('Trying to call via direct property access');
    const method = actor["list_all_videos"];
    if (method) {
      return method.apply(actor, []);
    }
  } catch (e) {
    console.log('Error calling list_all_videos via apply:', e);
  }
  
  // Look for methods with all lowercase letters
  for (const key of Object.getOwnPropertyNames(actor)) {
    // Try to find a method that might match what we're looking for
    if (/list.*videos/i.test(key)) {
      console.log(`Found likely method match: ${key}`);
      try {
        return actor[key]();
      } catch (e) {
        console.log(`Error calling ${key}:`, e);
      }
    }
  }
  
  // Last resort: try to see if there's a method we can intercept on the fly
  console.log("Attempting to execute raw request to 'list_all_videos'");
  try {
    // Try a hard-coded direct call as a last resort
    if (typeof actor.createActor === 'function') {
      console.log("Actor has createActor method, trying to access inner actor");
      // @ts-ignore - Attempt to access private actor instance
      return actor._innerActor?.list_all_videos?.();
    }
  } catch (e) {
    console.log("Error accessing inner actor:", e);
  }

  // Empty array fallback for development and debugging
  console.log("Returning empty array as fallback");
  return [];
}