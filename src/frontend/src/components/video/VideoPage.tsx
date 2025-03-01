import { useState } from 'react';
import { VideoGrid } from './VideoGrid';
import { VideoViewPage } from './VideoViewPage';
import { twMerge } from 'tailwind-merge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useSiwe } from 'ic-siwe-js/react';

interface VideoPageProps {
  className?: string;
}

export function VideoPage({ className = '' }: VideoPageProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'view'>('grid');
  const { identity } = useSiwe();

  // Handle video selection from grid
  const handleVideoSelect = (videoId: string) => {
    setSelectedVideoId(videoId);
    setViewMode('view');
  };

  // Handle back button click
  const handleBackClick = () => {
    setViewMode('grid');
    setSelectedVideoId(null);
  };

  // Render upload button (could be moved to a separate component)
  const renderUploadButton = () => {
    if (!identity) return null;

    return (
      <button
        className="fixed bottom-6 right-6 z-10 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Upload new video"
        onClick={() => {
          // Implement upload functionality or navigation
          console.log('Upload video clicked');
        }}
      >
        <FontAwesomeIcon icon={faUpload} className="text-xl" />
      </button>
    );
  };

  return (
    <div className={twMerge('min-h-screen bg-white dark:bg-gray-900', className)}>
      {viewMode === 'view' && selectedVideoId ? (
        <>
          <div className="sticky top-0 left-0 z-20 p-4 bg-white dark:bg-gray-900">
            <button
              onClick={handleBackClick}
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              <span>Back to videos</span>
            </button>
          </div>
          <VideoViewPage videoId={selectedVideoId} />
        </>
      ) : (
        <>
          <VideoGrid onVideoSelect={handleVideoSelect} />
          {renderUploadButton()}
        </>
      )}
    </div>
  );
}