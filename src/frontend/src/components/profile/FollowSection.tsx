import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from '../../ic/Actors';
import { twMerge } from 'tailwind-merge';
import { FollowButton } from '../ui/FollowButton';
import { useSiwe } from 'ic-siwe-js/react';

// Define types locally
interface UserProfile {
  evm_address: string;
  name: string;
  avatar_url: string;
  principal?: string;
}

interface BackendExtended {
  getFollowers: (principal: Principal) => Promise<Principal[]>;
  getFollowing: (principal: Principal) => Promise<Principal[]>;
  listProfiles: () => Promise<any>;
}

type TabType = 'followers' | 'following';

interface FollowSectionProps {
  userPrincipal: Principal;
  initialTab?: TabType;
  className?: string;
  onProfileClick?: (profile: UserProfile) => void;
}

export function FollowSection({
  userPrincipal,
  initialTab = 'followers',
  className = '',
  onProfileClick
}: FollowSectionProps) {
  const actor = useActor();
  const { identity } = useSiwe();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<Principal[]>([]);
  const [following, setFollowing] = useState<Principal[]>([]);
  const [followerProfiles, setFollowerProfiles] = useState<UserProfile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch followers and following data
  useEffect(() => {
    const fetchFollowData = async () => {
      if (!actor || !userPrincipal) return;
      
      setIsLoading(true);
      setLoadingError(null);
      
      try {
        const backendActor = actor as unknown as BackendExtended;
        
        // Fetch followers and following in parallel
        const [followersList, followingList] = await Promise.all([
          backendActor.getFollowers(userPrincipal),
          backendActor.getFollowing(userPrincipal)
        ]);
        
        setFollowers(followersList);
        setFollowing(followingList);
        
        // Fetch all profiles and map them to followers/following
        try {
          const profilesResult = await backendActor.listProfiles();
          if ('Ok' in profilesResult) {
            const profiles = profilesResult.Ok.map(([_, profile]: [string, UserProfile]) => ({
              ...profile,
              principal: _ // Store the principal as a property for reference
            }));
            
            // Map principals to profile data for followers
            const followerProfilesData = profiles.filter(
              (profile: UserProfile) => followersList.some(
                f => f.toString() === profile.principal
              )
            );
            
            // Map principals to profile data for following
            const followingProfilesData = profiles.filter(
              (profile: UserProfile) => followingList.some(
                f => f.toString() === profile.principal
              )
            );
            
            setFollowerProfiles(followerProfilesData);
            setFollowingProfiles(followingProfilesData);
          } else {
            throw new Error('Failed to fetch profiles');
          }
        } catch (err) {
          console.error("Error fetching profile data:", err);
          setLoadingError("Couldn't load profile information");
        }
      } catch (err) {
        console.error("Error fetching follow data:", err);
        setLoadingError("Failed to load followers/following data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFollowData();
  }, [actor, userPrincipal]);
  
  // Filter profiles based on search query
  const filteredProfiles = (activeTab === 'followers' ? followerProfiles : followingProfiles)
    .filter(profile => 
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.evm_address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
  // Handle profile click
  const handleProfileClick = (profile: UserProfile) => {
    if (onProfileClick) {
      onProfileClick(profile);
    }
  };
  
  // Handle follow state change
  const handleFollowStateChange = (profile: UserProfile, isFollowing: boolean) => {
    // This is where we could update a global state or context if needed
    console.log(`${profile.name} is now ${isFollowing ? 'followed' : 'unfollowed'}`);
  };
  
  return (
    <div className={twMerge("bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden", className)}>
      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          className={twMerge(
            "flex-1 py-3 px-4 text-center font-medium transition-colors",
            activeTab === 'followers'
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-300"
          )}
          onClick={() => setActiveTab('followers')}
        >
          Followers ({followers.length})
        </button>
        <button
          className={twMerge(
            "flex-1 py-3 px-4 text-center font-medium transition-colors",
            activeTab === 'following'
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-300"
          )}
          onClick={() => setActiveTab('following')}
        >
          Following ({following.length})
        </button>
      </div>
      
      {/* Search bar */}
      <div className="p-4 border-b dark:border-gray-700">
        <input
          type="text"
          placeholder="Search by name or address"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>
      
      {/* Content area */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          // Loading skeletons
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : loadingError ? (
          // Error state
          <div className="p-8 text-center">
            <p className="text-red-500 dark:text-red-400 mb-2">{loadingError}</p>
            <button 
              className="text-blue-600 dark:text-blue-400 text-sm" 
              onClick={() => window.location.reload()}
            >
              Try reloading
            </button>
          </div>
        ) : filteredProfiles.length > 0 ? (
          // Profile list
          <ul className="divide-y dark:divide-gray-700">
            {filteredProfiles.map(profile => (
              <li key={profile.principal} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div 
                    className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer"
                    onClick={() => handleProfileClick(profile)}
                  >
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl font-medium">
                        {profile.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  
                  {/* User info */}
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleProfileClick(profile)}
                  >
                    <h3 className="font-medium">{profile.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {profile.evm_address.substring(0, 6)}...{profile.evm_address.substring(profile.evm_address.length - 4)}
                    </p>
                  </div>
                  
                  {/* Follow button - only show if we're authenticated and not our own profile */}
                  {identity && profile.principal !== identity.getPrincipal().toString() && (
                    <FollowButton 
                      userPrincipal={Principal.fromText(profile.principal as string)}
                      size="sm"
                      onFollowStateChange={(isFollowing) => handleFollowStateChange(profile, isFollowing)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          // Empty state
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === 'followers' 
                ? "No followers yet" 
                : "Not following anyone yet"}
            </p>
            {activeTab === 'following' && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Follow other users to see them here
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}