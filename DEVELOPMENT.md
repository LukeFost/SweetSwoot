# Development Guide for SweetSwoot

This guide explains how to run the application in development mode with sample videos.

## Running with Sample Videos

The application has been modified to use sample videos from Google's video bucket when real Livepeer videos are not available. This allows you to develop and test the application without needing to upload real videos or have a Livepeer API key.

### Option 1: Using the Mock Backend

1. Start the mock backend server:
   ```bash
   node mock-backend.js
   ```

2. Start the frontend server:
   ```bash
   npm run dev -- --port 54500 --host 0.0.0.0
   ```

The mock backend provides sample video metadata and the frontend will display these videos using sample content from Google's video bucket.

### Option 2: Using the IC Replica

1. Start the IC replica:
   ```bash
   dfx start --clean
   ```

2. Deploy the backend:
   ```bash
   make deploy-backend
   ```

3. Deploy the frontend:
   ```bash
   make deploy-frontend
   ```

## How the Sample Videos Work

1. When a video's `storage_ref` starts with `livepeer:dev-pb-` or `livepeer:upload-`, the application recognizes it as a development placeholder.

2. Instead of trying to fetch from Livepeer, it uses a sample video from Google's video bucket.

3. Sample thumbnails are also used for the video grid, selected based on a hash of the video ID.

## Uploading Videos

When you upload a video through the UI:

1. The video will be "uploaded" but not actually sent to Livepeer.
2. A development placeholder ID will be generated.
3. The video will appear in the grid and be playable with sample content.

## Switching to Production

To switch to using real Livepeer videos:

1. Get a Livepeer API key and add it to your `.env` file:
   ```
   VITE_LIVEPEER_API_KEY=your-livepeer-api-key
   ```

2. Modify the `VideoUpload.tsx` component to use the real Livepeer API instead of the development fallback.

3. Deploy the application using the standard deployment process:
   ```bash
   make deploy-all
   ```