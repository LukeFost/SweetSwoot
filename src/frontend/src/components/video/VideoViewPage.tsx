import { useState, useEffect } from 'react';
import { useActor } from '../../ic/Actors';
import { useSiwe } from 'ic-siwe-js/react';
import { VideoPlayer } from '../../livepeer/VideoPlayer';
import { BackendExtended, UserProfile } from '../../livepeer/types';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faComment, faShare, faCoins, faUser } from '@fortawesome/free-solid-svg-icons';
import { CommentSection } from './CommentSection';
import { TipModal } from './TipModal';
import { TipHistory } from './TipHistory';
import { useAccount } from 'wagmi';
import { FollowButton } from '../ui/FollowButton';
import { FollowSection } from '../profile/FollowSection';
import { Principal } from '@dfinity/principal';
import Dialog from '../ui/Dialog';

interface VideoViewPageProps {
  videoId: string;
  className?: string;
}

export function VideoViewPage({ videoId, className = '' }: VideoViewPageProps) {
  const actor = useActor();
  const { identity } = useSiwe();
  const { } = useAccount();
  const [videoMetadata, setVideoMetadata] = useState<any>(null);
  const [videoAnalytics, setVideoAnalytics] = useState<any>(null);
  const [uploader, setUploader] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);

  // Fetch video data and check follow status
  useEffect(() => {
    if (!actor || !videoId) return;
    setIsLoading(true);
    setError(null);

    const backendActor = actor as unknown as BackendExtended;

    // Fetch video metadata
    const fetchVideoData = async () => {
      try {
        const metadata = await backendActor.get_video_metadata(videoId);
        setVideoMetadata(metadata);

        // Get video analytics
        try {
          const analytics = await backendActor.get_video_analytics(videoId);
          setVideoAnalytics(analytics);
        } catch (err) {
          console.error('Error fetching video analytics:', err);
        }

        // Try to get uploader profile
        try {
          // Get profiles from actor directly
          // @ts-ignore - API method exists in backend but types may not be updated
          const profilesResponse = await actor.list_profiles();
          if (profilesResponse && "Ok" in profilesResponse) {
            // Profiles is an array of [principal_string, UserProfile] tuples
            const profiles = profilesResponse.Ok;
            const uploaderProfile = profiles.find(
              ([_, profile]: [string, UserProfile]) => 
                profile.principal?.toString() === metadata.uploader_principal.toString()
            );
            
            if (uploaderProfile) {
              setUploader(uploaderProfile[1]);
              
              // Check if the current user is following the uploader and get followers count
              try {
                const uploaderPrincipal = Principal.fromText(metadata.uploader_principal.toString());
                
                // Get followers count
                const followers = await backendActor.get_followers(uploaderPrincipal);
                setFollowersCount(followers.length);
                
                // Check follow status if user is authenticated
                if (identity) {
                  const isFollowingResult = await backendActor.is_following(
                    identity.getPrincipal(),
                    uploaderPrincipal
                  );
                  setIsFollowing(isFollowingResult);
                }
              } catch (err) {
                console.error('Error checking follow status:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching uploader profile:', err);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching video metadata:', err);
        setError('Failed to load video: ' + (err instanceof Error ? err.message : String(err)));
        setIsLoading(false);
      }
    };

    fetchVideoData();
  }, [actor, videoId, identity]);

  // Update state when follow status changes
  const handleFollowStateChange = (isFollowingState: boolean) => {
    setIsFollowing(isFollowingState);
  };

  const handleShareClick = () => {
    // Implement share functionality
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    // Show a toast notification
  };

  // Share functionality implemented directly in handleShareClick

  // Format date from timestamp
  const formatDate = (timestamp: bigint) => {
    try {
      return formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };

  // Format large numbers (e.g., 1.2M instead of 1,200,000)
  const formatNumber = (num: number | bigint) => {
    const n = typeof num === 'bigint' ? Number(num) : num;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className={twMerge('flex flex-col lg:flex-row max-w-screen-2xl mx-auto px-4 py-6', className)}>
      {/* Top Search removed since it's already in the layout */}

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left: Video Player */}
        <div className="w-full lg:w-8/12">
          {error ? (
            <div className="bg-red-500 bg-opacity-20 text-red-100 p-6 rounded-lg mb-4">
              <h3 className="text-lg font-medium mb-2">Error Loading Video</h3>
              <p>{error}</p>
            </div>
          ) : isLoading || !videoMetadata ? (
            <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          ) : (
            <div className="rounded-lg overflow-hidden">
              <VideoPlayer
                videoId={videoId}
                className="w-full"
                autoPlay={true}
                loop={false}
              />
            </div>
          )}
        </div>

        {/* Right: Post Details & Engagement */}
        <div className="w-full lg:w-4/12 space-y-6">
          {isLoading || !videoMetadata ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <>
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden mr-3">
                    {uploader?.avatar_url ? (
                      <img
                        src={uploader.avatar_url}
                        alt={uploader.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {uploader?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">@{uploader?.name || 'unknown'}</div>
                    <div className="text-sm flex gap-2">
                      <span className="text-gray-500">
                        {videoMetadata.timestamp ? formatDate(videoMetadata.timestamp) : 'Unknown date'}
                      </span>
                      <button 
                        onClick={() => setIsFollowersModalOpen(true)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                      >
                        <FontAwesomeIcon icon={faUser} className="mr-1 text-xs" />
                        {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
                      </button>
                    </div>
                  </div>
                </div>
                {videoMetadata && videoMetadata.uploader_principal && (
                  <FollowButton 
                    userPrincipal={Principal.fromText(videoMetadata.uploader_principal.toString())}
                    initialFollowState={isFollowing}
                    onFollowStateChange={handleFollowStateChange}
                  />
                )}
              </div>

              {/* Post Caption */}
              <div className="space-y-2">
                <h1 className="text-xl font-semibold">{videoMetadata.title}</h1>
                <p className="text-gray-700 dark:text-gray-300">
                  {videoMetadata.description || 'No description'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {videoMetadata.tags?.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-blue-600 dark:text-blue-400 text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex justify-between py-4 border-t border-b dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-medium">
                    {videoAnalytics ? formatNumber(videoAnalytics.total_likes) : '0'}
                  </div>
                  <div className="text-xs text-gray-500">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium">
                    {videoAnalytics ? formatNumber(videoAnalytics.total_views) : '0'}
                  </div>
                  <div className="text-xs text-gray-500">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium">
                    {videoAnalytics ? formatNumber(videoAnalytics.total_completions) : '0'}
                  </div>
                  <div className="text-xs text-gray-500">Completions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium">
                    {/* Placeholder for shares or saves */}
                    0
                  </div>
                  <div className="text-xs text-gray-500">Shares</div>
                </div>
              </div>

              {/* Post Actions */}
              <div className="flex justify-between">
                <button className="flex items-center text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400">
                  <FontAwesomeIcon icon={faHeart} className="mr-2" />
                  <span>Like</span>
                </button>
                <button className="flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400">
                  <FontAwesomeIcon icon={faComment} className="mr-2" />
                  <span>Comment</span>
                </button>
                <button
                  onClick={() => setIsTipModalOpen(true)}
                  disabled={!identity}
                  className={`flex items-center ${
                    identity 
                      ? 'text-gray-700 dark:text-gray-300 hover:text-yellow-500 dark:hover:text-yellow-400' 
                      : 'text-gray-500 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <FontAwesomeIcon icon={faCoins} className="mr-2" />
                  <span>Tip</span>
                </button>
                <button
                  onClick={handleShareClick}
                  className="flex items-center text-gray-700 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400"
                >
                  <FontAwesomeIcon icon={faShare} className="mr-2" />
                  <span>Share</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comment Section and Tip History */}
      <div className="mt-8 w-full space-y-6">
        {!isLoading && videoMetadata && uploader && (
          <>
            {/* Tip History Component */}
            <TipHistory videoId={videoId} />
            
            {/* Comment Section */}
            <CommentSection videoId={videoId} />
            
            {/* Tip Modal */}
            <TipModal
              isOpen={isTipModalOpen}
              onClose={() => setIsTipModalOpen(false)}
              recipientAddress={uploader.evm_address}
              videoId={videoId}
              onTipComplete={async (amount, txHash) => {
                try {
                  // Record the tip in the backend
                  const backendActor = actor as unknown as BackendExtended;
                  // Convert amount to bigint with 18 decimals (ETH)
                  const amountInWei = BigInt(parseFloat(amount) * 10**18);
                  
                  await backendActor.record_tip(videoId, amountInWei, txHash);
                  
                  // Close modal after successful recording
                  setIsTipModalOpen(false);
                  
                  // You could add a toast notification here
                  
                } catch (err) {
                  console.error('Failed to record tip:', err);
                  throw err;
                }
              }}
            />
            
            {/* Followers Modal */}
            {videoMetadata && videoMetadata.uploader_principal && (
              <Dialog
                isOpen={isFollowersModalOpen}
                setIsOpen={setIsFollowersModalOpen}
              >
                <FollowSection 
                  userPrincipal={Principal.fromText(videoMetadata.uploader_principal.toString())}
                  className="max-h-[70vh]"
                  onProfileClick={(profile) => {
                    // Here you could navigate to profile page
                    console.log('Navigate to profile:', profile);
                    // Close modal after clicking a profile
                    setIsFollowersModalOpen(false);
                  }}
                />
              </Dialog>
            )}
          </>
        )}
      </div>
    </div>
  );
}