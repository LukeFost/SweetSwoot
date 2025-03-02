import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faHome, faCompass, faPlus, 
  faUser, faBars, faTimes
} from "@fortawesome/free-solid-svg-icons";
import Button from '../ui/Button';
import { AccountDialog } from '../AccountDialog';
import { VideoFeed, VideoUpload } from '../../video-service';
import { VideoGrid } from '../video/VideoGrid';
import { useSiwe } from 'ic-siwe-js/react';
import { SimpleSearch } from '../search/SimpleSearch';

interface MobileLayoutProps {
  onLoginClick: () => void;
  isAuthenticated: boolean;
}

// We've replaced the simple VideoCard with the full VideoGrid component

export default function MobileLayout({ onLoginClick, isAuthenticated }: MobileLayoutProps) {
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'feed' | 'search'>('grid');
  const { identity } = useSiwe();
  
  // We'll use real data from the backend instead of dummy videos

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    // Switch to the feed view to see the newly uploaded videos
    setActiveView('feed');
  };
  
  return (
    <div className="flex flex-col w-full min-h-screen text-white">
      {/* Mobile Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-zinc-900">
        <button className="p-2">
          <FontAwesomeIcon icon={faBars} />
        </button>
        
        <div className="flex-grow mx-4">
          <button 
            onClick={() => setActiveView('search')} 
            className="w-full px-4 py-2 text-left text-sm text-zinc-400 bg-zinc-800 rounded-full focus:outline-none"
          >
            Search videos...
          </button>
        </div>

        {isAuthenticated ? (
          <div onClick={() => setShowAccountDialog(true)} className="cursor-pointer">
            <div className="w-8 h-8 bg-zinc-700 rounded-full"></div>
          </div>
        ) : (
          <Button
            variant="primary"
            className="px-3 py-1 text-sm"
            onClick={onLoginClick}
          >
            Log in
          </Button>
        )}
      </div>
      
      {/* View Selector Buttons */}
      <div className="flex items-center justify-center p-2 space-x-4 bg-zinc-900">
        <button
          onClick={() => setActiveView('grid')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            activeView === 'grid' 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setActiveView('feed')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            activeView === 'feed' 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Feed
        </button>
      </div>
      
      {/* Content Area */}
      {activeView === 'search' ? (
        <div className="flex-grow">
          <SimpleSearch />
        </div>
      ) : activeView === 'grid' ? (
        <div className="flex-grow">
          <VideoGrid 
            className="p-3"
            onVideoSelect={() => {
              setActiveView('feed');
            }}
          />
        </div>
      ) : (
        <div className="flex-grow">
          <VideoFeed 
            className="h-[calc(100vh-128px)]"
          />
        </div>
      )}
      
      {/* Bottom Navigation */}
      <div className="sticky bottom-0 z-10 flex items-center justify-around p-3 bg-zinc-900 border-t border-zinc-800">
        <button 
          className="flex flex-col items-center text-zinc-400 active:text-white"
          onClick={() => setActiveView('feed')}
        >
          <FontAwesomeIcon icon={faHome} className="text-lg" />
          <span className="mt-1 text-xs">Home</span>
        </button>
        
        <button 
          className="flex flex-col items-center text-zinc-400 active:text-white"
          onClick={() => setActiveView('grid')}
        >
          <FontAwesomeIcon icon={faCompass} className="text-lg" />
          <span className="mt-1 text-xs">Discover</span>
        </button>
        
        <button 
          className="flex flex-col items-center text-zinc-400 active:text-white"
          onClick={() => {
            if (identity) {
              setShowUploadModal(true);
            } else {
              onLoginClick();
            }
          }}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <FontAwesomeIcon icon={faPlus} className="text-xl text-white" />
          </div>
        </button>
        
        <button className="flex flex-col items-center text-zinc-400 active:text-white">
          <FontAwesomeIcon icon={faUser} className="text-lg" />
          <span className="mt-1 text-xs">Profile</span>
        </button>
      </div>
      
      {/* Account Dialog */}
      {showAccountDialog && (
        <AccountDialog isOpen={showAccountDialog} setIsOpen={setShowAccountDialog} />
      )}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-xl">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute p-2 text-white bg-zinc-800 rounded-full -top-3 -right-3 hover:bg-zinc-700"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}
    </div>
  );
}