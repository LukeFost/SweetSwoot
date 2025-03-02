import * as dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Load environment variables with explicit logging
const envLocal = path.resolve(__dirname, '.env.local');
const envFile = path.resolve(__dirname, '.env');

console.log('Checking for environment files:');
console.log(`.env.local exists: ${fs.existsSync(envLocal)}`);
console.log(`.env exists: ${fs.existsSync(envFile)}`);

// Load .env.local first (higher priority)
dotenv.config({ path: envLocal });

// Then load .env (lower priority)
dotenv.config({ path: envFile });

// Debug: Print loaded environment variables (only the Vite ones for safety)
console.log('Loaded environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('VITE_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key] ? 'Set ✓' : 'Not set ✗'}`);
  });

const processEnvCanisterIds = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith("CANISTER_ID"))
    .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
);

export default defineConfig({
  build: {
    outDir: "../../dist",
  },
  plugins: [react()],
  root: "src/frontend",
  server: {
    host: "127.0.0.1",
    proxy: {
      // Proxy all http requests made to /api to the running dfx instance
      "/api": {
        target: `http://127.0.0.1:4943`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
  define: {
    // Define the canister ids for the frontend to use. Currently, dfx generated
    // code relies on variables being defined as process.env.CANISTER_ID_*
    ...processEnvCanisterIds,
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.DFX_NETWORK": JSON.stringify(process.env.DFX_NETWORK),
    // Explicitly pass through Vite environment variables
    "import.meta.env.VITE_PINATA_JWT": JSON.stringify(process.env.VITE_PINATA_JWT),
    "import.meta.env.VITE_GATEWAY_URL": JSON.stringify(process.env.VITE_GATEWAY_URL),
    "import.meta.env.VITE_LIVEPEER_API_KEY": JSON.stringify(process.env.VITE_LIVEPEER_API_KEY),
    "import.meta.env.VITE_BETA_MODE": JSON.stringify(process.env.VITE_BETA_MODE === 'true'),
    global: "globalThis",
  },
});
