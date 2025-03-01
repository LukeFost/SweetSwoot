import { useState, ChangeEvent } from 'react';
import { useActor } from '../ic/Actors';
import { v4 as uuidv4 } from 'uuid';
import { livepeerClient } from './LivepeerProvider';
import { BackendExtended } from './types';

interface VideoUploadProps {
  onUploadComplete?: (videoId: string, playbackId: string) => void;
  className?: string;
}

export function VideoUpload({ onUploadComplete, className = '' }: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<File | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const actor = useActor();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleTagsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTags(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!videoFile) {
      setError('Please select a video file to upload');
      return;
    }
    
    if (!title) {
      setError('Please enter a title for your video');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload the video file to LivePeer
      const asset = await livepeerClient.uploadVideo(videoFile, title, (progress) => {
        setUploadProgress(Math.round(progress * 100));
      });

      if (asset && asset.playbackId) {
        const videoId = uuidv4();
        const playbackId = asset.playbackId;
        const storageRef = playbackId ? `livepeer:${playbackId}` : '';
        const tagsList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        // Save metadata to backend when upload is complete
        // Cast the actor to our extended type
        const backendActor = actor as unknown as BackendExtended;
        
        const response = await backendActor.createVideoMetadata(videoId, title, tagsList, [storageRef]);
        
        if ('Ok' in response) {
          onUploadComplete?.(videoId, playbackId);
        } else if ('Err' in response) {
          setError(`Failed to save video metadata: ${response.Err}`);
        }
      }
    } catch (err) {
      setError('Failed to upload: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto bg-zinc-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={handleTagsChange}
            className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="funny, dance, music"
          />
        </div>
        
        <div>
          <label htmlFor="video" className="block text-sm font-medium mb-1">
            Video File
          </label>
          <input
            type="file"
            id="video"
            accept="video/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
        
        {isUploading && (
          <div className="mt-4">
            <p className="text-sm font-medium">Uploading: {uploadProgress}%</p>
            <div className="w-full bg-zinc-700 rounded-full h-2.5 mt-1">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isUploading}
          className={`w-full py-2 px-4 rounded-md transition-colors ${
            isUploading 
              ? 'bg-zinc-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
}