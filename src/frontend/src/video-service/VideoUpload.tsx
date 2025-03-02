import { useRef, useState } from 'react';
import { useVideoService } from './VideoServiceProvider';
import { useActor } from '../ic/Actors';

export interface VideoUploadProps {
  onSuccess?: (videoId: string) => void;
  onError?: (error: any) => void;
  className?: string;
  onUploadComplete?: () => void;
}

export function VideoUpload({ onSuccess, onError, className = '', onUploadComplete }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get our video service and actor
  const { uploadVideo, isLoading, ipfsReady, livepeerReady } = useVideoService();
  const actor = useActor();
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check if it's a video file
    if (!selectedFile.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }
    
    setFile(selectedFile);
  };
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      alert('Please provide a video file and title.');
      return;
    }
    if (!actor) {
      alert('Backend not connected.');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10);
      setStatusMessage('Starting upload process...');

      // 1. Upload to IPFS and create Livepeer asset
      setProgress(20);
      setStatusMessage('Uploading to IPFS...');
      const videoInfo = await uploadVideo(file, title, description);
      
      setProgress(60);
      setStatusMessage('Creating Livepeer asset for transcoding...');
      
      // 2. Save metadata to your backend
      setProgress(80);
      setStatusMessage('Saving video metadata to IC backend...');
      
      try {
        // @ts-ignore  (depending on your .did definitions)
        const result = await actor.create_video_metadata(
          videoInfo.id,
          title,
          tags.split(',').map(t => t.trim()).filter(Boolean),
          [`ipfs:${videoInfo.ipfsCid}`] // pass as single-element array
        );
  
        setProgress(100);
        setStatusMessage('Upload complete!');
        console.log('[VideoUpload] create_video_metadata result:', result);
  
        if (onSuccess) onSuccess(videoInfo.id);
        if (onUploadComplete) onUploadComplete();
      } catch (metadataError) {
        console.warn('[VideoUpload] create_video_metadata error:', metadataError);
        
        // Check if this is a "Video ID already exists" error
        const errorStr = String(metadataError);
        if (errorStr.includes('Video ID already exists')) {
          console.log('[VideoUpload] Video ID already exists error handled - proceeding with upload anyway');
          
          // Even though metadata creation failed, we still have valid video info
          // The video is already uploaded to IPFS and Livepeer
          setProgress(100);
          setStatusMessage('Upload complete! (Note: Video already exists in the system)');
          
          if (onSuccess) onSuccess(videoInfo.id);
          if (onUploadComplete) onUploadComplete();
        } else {
          // For other errors, propagate them
          throw metadataError;
        }
      }

      // Reset form
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setDescription('');
        setTags('');
        setStatusMessage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsUploading(false);
      }, 1500); // Brief delay to show the completion status
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (onError) onError(error);
      setIsUploading(false);
    }
  };
  
  // Handle click on upload button
  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className={`bg-zinc-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="flex items-center mb-3">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            <span className="ml-3">Initializing services...</span>
          </div>
          <p className="text-sm text-zinc-400">
            Setting up video services. This should only take a moment.
            <br/>
            If this message persists, check browser console for errors.
          </p>
        </div>
      ) : !ipfsReady || !livepeerReady ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded-lg mb-4">
          <h3 className="font-medium text-lg">Service Unavailable</h3>
          {!ipfsReady && !livepeerReady ? (
            <p>Both IPFS and Livepeer services failed to initialize.</p>
          ) : !ipfsReady ? (
            <div>
              <p className="mb-2">IPFS service is not ready. Missing configuration:</p>
              <div className="bg-red-900 bg-opacity-40 p-3 rounded text-sm font-mono">
                <p>1. Create a <strong>.env.local</strong> file in your project root</p>
                <p>2. Add the following line:</p>
                <pre className="mt-1 ml-4 text-yellow-200">
                  VITE_PINATA_JWT=your_jwt_token_here
                </pre>
                <p className="mt-2">3. Restart your development server</p>
                <p className="mt-2 text-xs">See docs/PINATA_SETUP.md for more details</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2">Livepeer service is not ready. Missing configuration:</p>
              <div className="bg-red-900 bg-opacity-40 p-3 rounded text-sm font-mono">
                <p>1. Create a <strong>.env.local</strong> file in your project root</p>
                <p>2. Add the following line:</p>
                <pre className="mt-1 ml-4 text-yellow-200">
                  VITE_LIVEPEER_API_KEY=your_api_key_here
                </pre>
                <p className="mt-2">3. Restart your development server</p>
                <p className="mt-2 text-xs">You can get an API key from livepeer.studio</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* File input - hidden */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Upload area */}
          {!file ? (
            <div 
              onClick={handleClickUpload}
              className="border-2 border-dashed border-zinc-600 rounded-lg p-8 mb-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <div className="text-zinc-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>Click to select or drag a video file here</p>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-start space-x-4">
                {/* Video file info */}
                <div className="flex-shrink-0 w-32 h-24 bg-zinc-700 rounded overflow-hidden flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* File info */}
                <div className="flex-grow">
                  <p className="font-medium text-zinc-300">{file.name}</p>
                  <p className="text-sm text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  
                  <button 
                    type="button" 
                    onClick={handleClickUpload}
                    className="mt-2 text-sm text-blue-500"
                  >
                    Change video
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-zinc-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-700 rounded border border-zinc-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-700 rounded border border-zinc-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>
          
          {/* Tags */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-zinc-400 mb-1">
              Tags (comma separated)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. music, nature, tutorial"
              className="w-full px-3 py-2 bg-zinc-700 rounded border border-zinc-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>
          
          {/* Upload button */}
          <button
            type="submit"
            disabled={isUploading || !file || !title}
            className={`w-full py-2 px-4 rounded text-white font-medium ${
              isUploading || !file || !title 
                ? 'bg-zinc-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </button>
          
          {/* Progress bar */}
          {isUploading && (
            <div className="mt-4">
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-sm text-zinc-400">{statusMessage}</p>
                <p className="text-sm text-zinc-400">{progress}%</p>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
