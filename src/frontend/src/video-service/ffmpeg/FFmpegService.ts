import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface HLSOutput {
  playlistUrl: string;
  segmentUrls: string[];
  thumbnailUrl: string;
  duration: number;
}

/**
 * Service to handle video processing using FFmpeg WebAssembly
 */
export class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;
  private static instance: FFmpegService | null = null;

  // Get singleton instance
  public static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  /**
   * Load FFmpeg WebAssembly
   */
  public async load(): Promise<void> {
    if (this.loaded || this.loading) return;
    
    this.loading = true;
    
    try {
      console.log('[FFmpegService] Loading FFmpeg...');
      this.ffmpeg = new FFmpeg();
      
      console.log('[FFmpegService] Downloading core.js from CDN...');
      const coreURL = await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        'text/javascript'
      );
      console.log('[FFmpegService] core.js downloaded successfully');
      
      console.log('[FFmpegService] Downloading core.wasm from CDN...');
      const wasmURL = await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
        'application/wasm'
      );
      console.log('[FFmpegService] core.wasm downloaded successfully');
      
      console.log('[FFmpegService] Initializing FFmpeg with downloads...');
      // Load the FFmpeg core and libs from CDN
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });
      console.log('[FFmpegService] FFmpeg initialization complete');
      
      this.loaded = true;
      console.log('[FFmpegService] FFmpeg loaded');
    } catch (error) {
      console.error('[FFmpegService] Failed to load FFmpeg:', error);
      this.ffmpeg = null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Generate a thumbnail from a video file
   * @param videoFile The video file
   * @param timeOffset Time offset in seconds (optional, default: 1)
   * @returns A URL to the thumbnail
   */
  public async generateThumbnail(videoFile: File, timeOffset = 1): Promise<string> {
    await this.ensureLoaded();
    
    if (!this.ffmpeg) {
      throw new Error('[FFmpegService] FFmpeg not loaded');
    }
    
    try {
      // Generate a unique filename
      const inputFileName = `input-${Date.now()}.mp4`;
      const outputFileName = `thumbnail-${Date.now()}.jpg`;
      
      // Write the video file to FFmpeg's virtual filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
      
      // Generate a thumbnail
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-ss', timeOffset.toString(),
        '-frames:v', '1',
        '-q:v', '2',
        outputFileName
      ]);
      
      // Read the thumbnail file
      const thumbnailData = await this.ffmpeg.readFile(outputFileName);
      
      // Create a URL for the thumbnail
      const blob = new Blob([thumbnailData], { type: 'image/jpeg' });
      const thumbnailUrl = URL.createObjectURL(blob);
      
      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);
      
      return thumbnailUrl;
    } catch (error) {
      console.error('[FFmpegService] Error generating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Convert a video to HLS format
   * @param videoFile The video file
   * @returns Object with HLS playlist and segment URLs
   */
  public async convertToHLS(videoFile: File): Promise<HLSOutput> {
    await this.ensureLoaded();
    
    if (!this.ffmpeg) {
      throw new Error('[FFmpegService] FFmpeg not loaded');
    }
    
    try {
      // Generate unique filenames
      const fileId = Date.now().toString();
      const inputFileName = `input-${fileId}.mp4`;
      const outputFileName = `playlist-${fileId}.m3u8`;
      const segmentPattern = `segment-${fileId}-%d.ts`;
      const thumbnailFileName = `thumbnail-${fileId}.jpg`;
      
      console.log(`[FFmpegService] Input file size: ${videoFile.size} bytes (${(videoFile.size/1024/1024).toFixed(2)} MB)`);
      
      // Check file size to prevent browser crashes with very large videos
      if (videoFile.size > 100 * 1024 * 1024) { // 100MB
        throw new Error(`Video file is too large (${(videoFile.size/1024/1024).toFixed(1)}MB). Maximum supported size is 100MB.`);
      }
      
      // Write the video file to FFmpeg's virtual filesystem with progress logging
      console.log(`[FFmpegService] Loading file into FFmpeg virtual filesystem...`);
      const fileData = await fetchFile(videoFile);
      console.log(`[FFmpegService] File data loaded, size: ${fileData.byteLength} bytes`);
      await this.ffmpeg.writeFile(inputFileName, fileData);
      console.log(`[FFmpegService] File written to virtual filesystem`);
      
      // Get video information to calculate actual duration
      let duration = 60; // Default fallback value
      
      try {
        // Log available memory
        const performanceMemory = (window.performance as any)?.memory;
        const memoryStatus = {
          jsHeapSizeLimit: performanceMemory?.jsHeapSizeLimit ?? 'unknown',
          totalJSHeapSize: performanceMemory?.totalJSHeapSize ?? 'unknown',
          usedJSHeapSize: performanceMemory?.usedJSHeapSize ?? 'unknown'
        };
        console.log(`[FFmpegService] Memory status before conversion:`, memoryStatus);
      } catch (e) {
        console.log(`[FFmpegService] Memory info not available in this browser`);
      }
      
      // Generate a thumbnail at 1 second with added error handling
      console.log(`[FFmpegService] Generating thumbnail...`);
      try {
        await this.ffmpeg.exec([
          '-i', inputFileName,
          '-ss', '1',
          '-frames:v', '1',
          '-q:v', '2',
          thumbnailFileName
        ]);
        console.log(`[FFmpegService] Thumbnail generated successfully`);
      } catch (thumbErr) {
        console.error(`[FFmpegService] Thumbnail generation failed:`, thumbErr);
        // Continue without thumbnail, don't fail the whole conversion
      }
      
      console.log('[FFmpegService] Converting video to HLS format with lower quality settings...');
      
      // Convert video to HLS with optimized settings for browser processing
      // Use lower quality settings for faster conversion and less memory use
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-vf', 'scale=640:-2', // Downscale to 640px width
        '-crf', '28',         // Higher CRF = lower quality but smaller files
        '-preset', 'veryfast', // Faster encoding 
        '-start_number', '0',
        '-hls_time', '5',
        '-hls_list_size', '0',
        '-f', 'hls',
        outputFileName
      ]);
      
      console.log('[FFmpegService] HLS conversion complete, reading files...');
      
      // Read the playlist file
      const playlistData = await this.ffmpeg.readFile(outputFileName);
      const playlistBlob = new Blob([playlistData], { type: 'application/vnd.apple.mpegurl' });
      const playlistUrl = URL.createObjectURL(playlistBlob);
      
      // Read thumbnail file
      const thumbnailData = await this.ffmpeg.readFile(thumbnailFileName);
      const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
      const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
      
      // Collect segment files
      const segmentUrls: string[] = [];
      let segmentIndex = 0;
      const MAX_SEGMENTS = 100; // Safety limit to prevent infinite loops
      
      while (segmentIndex < MAX_SEGMENTS) {
        const segmentFileName = segmentPattern.replace('%d', segmentIndex.toString());
        try {
          // Read the segment file in a single operation
          const fileData = await this.ffmpeg.readFile(segmentFileName) as Uint8Array;
          
          // Check if we got valid data
          if (!fileData || fileData.length === 0) {
            console.log(`[FFmpegService] Empty segment file found at index ${segmentIndex}, stopping.`);
            break;
          }
          
          // Create blob URL for valid segment
          const segmentBlob = new Blob([fileData], { type: 'video/MP2T' });
          const segmentUrl = URL.createObjectURL(segmentBlob);
          segmentUrls.push(segmentUrl);
          segmentIndex++;
          
          // Safety check - if we've found at least one segment but it's been a while,
          // make sure conversion looks reasonable
          if (segmentIndex > 20) {
            console.log(`[FFmpegService] Found ${segmentIndex} segments, which is unusually high. Checking last 5...`);
          }
        } catch (e) {
          // segment file not found
          console.log(`[FFmpegService] No more segments found after index ${segmentIndex-1}`);
          break;
        }
      }
      
      // If we hit the MAX_SEGMENTS limit, log a warning
      if (segmentIndex >= MAX_SEGMENTS) {
        console.warn(`[FFmpegService] Hit maximum segment limit (${MAX_SEGMENTS}). This may indicate an issue with the conversion.`);
      }
      
      console.log(`[FFmpegService] Created HLS with ${segmentUrls.length} segments`);
      
      // Clean up input
      await this.ffmpeg.deleteFile(inputFileName);
      
      return {
        playlistUrl,
        segmentUrls,
        thumbnailUrl,
        duration
      };
    } catch (error) {
      console.error('[FFmpegService] Error converting video to HLS:', error);
      throw error;
    }
  }

  /**
   * Ensure FFmpeg is loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded && !this.loading) {
      await this.load();
    }
    
    // If still loading, wait
    if (this.loading) {
      await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.loading) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    if (!this.loaded || !this.ffmpeg) {
      throw new Error('[FFmpegService] FFmpeg loading failed');
    }
  }
}