import { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faHome, faCompass, faUsers, faUpload, 
  faVideo, faCoins, faUser, faEllipsisH,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import AddressPill from '../AddressPill';
import { useAccount } from 'wagmi';
import Button from '../ui/Button';
import { AccountDialog } from '../AccountDialog';
import { VideoFeed, VideoUpload } from '../../livepeer';
import { useSiwe } from 'ic-siwe-js/react';
import { VideoViewPage } from '../video/VideoViewPage';
import { VideoGrid } from '../video/VideoGrid';
import { SimpleSearch } from '../search/SimpleSearch';

interface DesktopLayoutProps {
  onLoginClick: () => void;
  isAuthenticated: boolean;
}

// Grid item component for internal use only
// Will be replaced by the VideoGrid component

export default function DesktopLayout({ onLoginClick, isAuthenticated }: DesktopLayoutProps) {
  const [activeTab, setActiveTab] = useState("All");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'feed' | 'view' | 'search'>('grid');
  const [selectedVideoTag, setSelectedVideoTag] = useState<string | undefined>(undefined);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const { address } = useAccount();
  const { identity } = useSiwe();

  const navLinks = [
    { 
      label: "For You", 
      icon: faHome, 
      onClick: () => {
        setActiveView('feed');
        setSelectedVideoTag(undefined);
        setSelectedVideoId(null);
      }
    },
    { 
      label: "Explore", 
      icon: faCompass,
      onClick: () => {
        setActiveView('grid');
        setSelectedVideoTag(undefined);
        setSelectedVideoId(null);
      }
    },
    { label: "Following", icon: faUsers },
    { 
      label: "Upload", 
      icon: faUpload,
      onClick: () => {
        if (identity) {
          setShowUploadModal(true);
        } else {
          onLoginClick();
        }
      }
    },
    { label: "LIVE", icon: faVideo },
    { label: "Get Coins", icon: faCoins },
    { label: "Profile", icon: faUser },
    { label: "More", icon: faEllipsisH },
  ];

  const categoryTabs = [
    "All", "Singing & Dancing", "Comedy", "Sports", "Anime & Comics", 
    "Relationship", "Shows", "Lipsync", "Daily Life", "Beauty Care", 
    "Games", "Society", "Outfit", "Cars"
  ];

  // Dummy videos have been removed - now using real data from backend
  
  // Handle category tab click
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    // Filter by tag for both feed and grid views
    if (tab !== 'All') {
      setSelectedVideoTag(tab.toLowerCase());
    } else {
      setSelectedVideoTag(undefined);
    }
    
    // If we're in video view, go back to grid/feed
    if (activeView === 'view') {
      setActiveView('grid');
      setSelectedVideoId(null);
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    // Switch to the feed view to see the newly uploaded videos
    setActiveView('feed');
  };
  
  return (
    <div className="flex w-full h-screen text-white">
      {/* Left Sidebar */}
      <div className="flex flex-col w-64 h-full p-4 border-r border-zinc-700 bg-zinc-850">
        <div className="flex items-center justify-center h-12 mb-6">
          <span className="text-2xl font-bold">SweetSwoot</span>
        </div>
        
        <nav className="flex-grow mb-6 space-y-2">
          {navLinks.map(link => (
            <div 
              key={link.label}
              className="flex items-center gap-3 px-4 py-3 transition-colors rounded-lg cursor-pointer hover:bg-zinc-700"
              onClick={link.onClick}
            >
              <FontAwesomeIcon icon={link.icon} />
              <span>{link.label}</span>
            </div>
          ))}
        </nav>
        
        {isAuthenticated ? (
          <div onClick={() => setShowAccountDialog(true)} className="cursor-pointer">
            <AddressPill address={address || ""} className="w-full bg-zinc-700" />
          </div>
        ) : (
          <Button 
            variant="primary" 
            className="w-full py-3"
            onClick={onLoginClick}
          >
            Log in
          </Button>
        )}
        
        <div className="pt-6 mt-6 text-xs text-zinc-500 border-t border-zinc-700">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="cursor-pointer hover:underline">Company</span>
            <span className="cursor-pointer hover:underline">Program</span>
            <span className="cursor-pointer hover:underline">Terms & Policies</span>
          </div>
          <span>© 2025 SweetSwoot</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-grow h-full overflow-y-auto">
        {/* Search Button */}
        <div className="sticky top-0 z-10 flex items-center justify-center p-4 bg-zinc-900">
          <div className="w-full max-w-md">
            <button 
              onClick={() => setActiveView('search')} 
              className="w-full px-4 py-2 text-left text-zinc-400 bg-zinc-800 rounded-full focus:outline-none hover:bg-zinc-700"
            >
              Search videos...
            </button>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="sticky top-16 z-10 flex px-4 py-2 space-x-4 overflow-x-auto bg-zinc-900">
          {categoryTabs.map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm rounded-full whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-zinc-700 text-white" 
                  : "bg-transparent text-zinc-400 hover:bg-zinc-800"
              }`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* View Selector Buttons */}
        <div className="flex items-center justify-center p-4 space-x-4">
          <button
            onClick={() => setActiveView('grid')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setActiveView('feed')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'feed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Feed View
          </button>
        </div>
        
        {/* Content Area */}
        <div className="p-4 h-[calc(100vh-146px)]">
          {activeView === 'search' ? (
            <SimpleSearch />
          ) : activeView === 'view' && selectedVideoId ? (
            <div className="h-full">
              <div className="mb-4">
                <button
                  onClick={() => {
                    // Return to previous view
                    setActiveView(activeView === 'view' ? 'grid' : activeView);
                    setSelectedVideoId(null);
                  }}
                  className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <FontAwesomeIcon icon={faHome} className="mr-2" />
                  <span>Back to videos</span>
                </button>
              </div>
              <VideoViewPage videoId={selectedVideoId} />
            </div>
          ) : activeView === 'grid' ? (
            <VideoGrid 
              tag={activeTab === "All" ? undefined : activeTab.toLowerCase()}
              onVideoSelect={(videoId) => {
                setSelectedVideoId(videoId);
                setActiveView('view');
              }}
              className="bg-zinc-900"
            />
          ) : (
            <VideoFeed 
              tag={selectedVideoTag}
              className="h-full rounded-lg overflow-hidden"
              onVideoSelect={(videoId) => {
                setSelectedVideoId(videoId);
                setActiveView('view');
              }}
            />
          )}
        </div>
      </div>

      {/* Account Dialog */}
      {showAccountDialog && (
        <AccountDialog isOpen={showAccountDialog} setIsOpen={setShowAccountDialog} />
      )}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-full max-w-xl p-1 bg-zinc-900 rounded-xl">
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