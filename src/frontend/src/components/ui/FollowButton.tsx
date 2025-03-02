import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useSiwe } from 'ic-siwe-js/react';
import { useActor } from '../../ic/Actors';
import { twMerge } from 'tailwind-merge';

// Define BackendExtended type locally
interface BackendExtended {
  followUser: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  unfollowUser: (principal: Principal) => Promise<{ Ok: null } | { Err: string }>;
  isFollowing: (follower: Principal, followed: Principal) => Promise<boolean>;
}

type FollowButtonSize = 'sm' | 'md' | 'lg';

interface FollowButtonProps {
  userPrincipal: Principal;
  initialFollowState?: boolean;
  className?: string;
  onFollowStateChange?: (isFollowing: boolean) => void;
  size?: FollowButtonSize;
}

export function FollowButton({
  userPrincipal,
  initialFollowState = false,
  className = '',
  onFollowStateChange,
  size = 'md'
}: FollowButtonProps) {
  const actor = useActor();
  const { identity } = useSiwe();
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Size-based class mapping
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-4 py-1 text-sm',
    lg: 'px-6 py-2 text-base'
  };

  // Check initial follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!actor || !identity || !userPrincipal) return;
      
      try {
        const backendActor = actor as unknown as BackendExtended;
        const myPrincipal = identity.getPrincipal();
        
        // Skip if we're viewing our own profile
        if (myPrincipal.toString() === userPrincipal.toString()) return;
        
        const following = await backendActor.isFollowing(
          myPrincipal,
          userPrincipal
        );
        
        setIsFollowing(following);
        if (onFollowStateChange) {
          onFollowStateChange(following);
        }
      } catch (err) {
        console.error("Error checking follow status:", err);
        setError("Couldn't check follow status");
      }
    };
    
    checkFollowStatus();
  }, [actor, identity, userPrincipal, onFollowStateChange]);
  
  const handleFollowClick = async () => {
    if (!actor || !identity) return;
    
    // Clear any previous errors
    setError(null);
    setIsLoading(true);
    
    try {
      const backendActor = actor as unknown as BackendExtended;
      const previousState = isFollowing;
      
      // Optimistically update UI
      setIsFollowing(!isFollowing);
      if (onFollowStateChange) {
        onFollowStateChange(!isFollowing);
      }
      
      // Call appropriate API based on current follow state
      if (isFollowing) {
        const result = await backendActor.unfollowUser(userPrincipal);
        if ('Err' in result) {
          // Revert on error
          setIsFollowing(previousState);
          if (onFollowStateChange) {
            onFollowStateChange(previousState);
          }
          setError(result.Err);
        }
      } else {
        const result = await backendActor.followUser(userPrincipal);
        if ('Err' in result) {
          // Revert on error
          setIsFollowing(previousState);
          if (onFollowStateChange) {
            onFollowStateChange(previousState);
          }
          setError(result.Err);
        }
      }
    } catch (err) {
      console.error("Error updating follow status:", err);
      setError("Failed to update follow status");
      
      // Revert to previous state on error
      setIsFollowing(isFollowing);
      if (onFollowStateChange) {
        onFollowStateChange(isFollowing);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Don't render the button for our own profile
  if (identity && identity.getPrincipal().toString() === userPrincipal.toString()) {
    return null;
  }
  
  return (
    <div className="relative">
      <button
        onClick={handleFollowClick}
        disabled={isLoading || !identity}
        className={twMerge(
          `rounded-full transition-colors duration-200 font-medium ${sizeClasses[size]}`,
          isFollowing
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
            : 'bg-blue-600 text-white dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600',
          isLoading && 'opacity-70 cursor-wait',
          !identity && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={isFollowing ? 'Unfollow' : 'Follow'}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </span>
        ) : (
          isFollowing ? 'Following' : 'Follow'
        )}
      </button>
      
      {/* Error message */}
      {error && (
        <div className="absolute mt-1 w-full">
          <div className="bg-red-50 text-red-600 text-xs p-1 rounded border border-red-200">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}