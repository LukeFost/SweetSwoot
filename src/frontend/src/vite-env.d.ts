/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add environment variables as needed
  readonly VITE_PINATA_JWT?: string;
  readonly VITE_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
