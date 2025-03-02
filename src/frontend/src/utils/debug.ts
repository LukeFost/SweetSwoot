/**
 * Debug utilities for diagnosing video playback issues
 */

// Collection of logs categorized by source
const logStore: Record<string, any[]> = {
  livepeer: [],
  ipfs: [],
  player: [],
  general: []
};

// Maximum logs to keep per category
const MAX_LOGS = 500;

/**
 * Log a debug message with category and optional data
 */
export function logDebug(category: 'livepeer' | 'ipfs' | 'player' | 'general', level: 'info' | 'warn' | 'error', message: string, data?: any) {
  // Create log entry with timestamp
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  
  // Store in appropriate category
  if (!logStore[category]) {
    logStore[category] = [];
  }
  
  // Add to store, limiting size
  logStore[category].push(entry);
  if (logStore[category].length > MAX_LOGS) {
    logStore[category].shift();
  }
  
  // Also log to console with appropriate prefix
  const prefix = `[${category.toUpperCase()}]`;
  switch (level) {
    case 'error':
      console.error(prefix, message, data !== undefined ? data : '');
      break;
    case 'warn':
      console.warn(prefix, message, data !== undefined ? data : '');
      break;
    case 'info':
    default:
      console.log(prefix, message, data !== undefined ? data : '');
  }
}

/**
 * Dump all logs to console and return them
 */
export function dumpDebugLogs() {
  console.log('=== VIDEO PLAYBACK DEBUG LOGS ===');
  Object.entries(logStore).forEach(([category, logs]) => {
    console.log(`== ${category.toUpperCase()} LOGS (${logs.length}) ==`);
    logs.forEach(log => {
      console.log(`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`, log.data || '');
    });
  });
  
  return logStore;
}

/**
 * Export category-specific logger functions
 */
export const livepeerLog = {
  info: (message: string, data?: any) => logDebug('livepeer', 'info', message, data),
  warn: (message: string, data?: any) => logDebug('livepeer', 'warn', message, data),
  error: (message: string, data?: any) => logDebug('livepeer', 'error', message, data),
};

export const ipfsLog = {
  info: (message: string, data?: any) => logDebug('ipfs', 'info', message, data),
  warn: (message: string, data?: any) => logDebug('ipfs', 'warn', message, data),
  error: (message: string, data?: any) => logDebug('ipfs', 'error', message, data),
};

export const playerLog = {
  info: (message: string, data?: any) => logDebug('player', 'info', message, data),
  warn: (message: string, data?: any) => logDebug('player', 'warn', message, data),
  error: (message: string, data?: any) => logDebug('player', 'error', message, data),
};

/**
 * Test URL connectivity
 * Use this to test if URLs can be accessed (manifest files, etc.)
 */
export async function testUrl(url: string): Promise<{success: boolean, status?: number, error?: string}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      success: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
