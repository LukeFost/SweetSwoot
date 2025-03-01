import { useState, useEffect } from 'react';
import { useActor } from '../../ic/Actors';
import { useSiwe } from 'ic-siwe-js/react';
import { BackendExtended } from '../../livepeer/types';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faReply } from '@fortawesome/free-solid-svg-icons';

interface Comment {
  commenter_principal: string;
  text: string;
  timestamp: bigint;
  commenter_name?: string;
  commenter_avatar?: string;
}

interface CommentSectionProps {
  videoId: string;
  className?: string;
}

export function CommentSection({ videoId, className = '' }: CommentSectionProps) {
  const actor = useActor();
  const { identity } = useSiwe();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  // Fetch comments
  useEffect(() => {
    if (!actor || !videoId) return;
    setIsLoading(true);
    setError(null);

    const backendActor = actor as unknown as BackendExtended;

    const fetchComments = async () => {
      try {
        const fetchedComments = await backendActor.get_comments(videoId);
        
        // Sort by timestamp (newest first)
        fetchedComments.sort((a: Comment, b: Comment) => 
          Number(b.timestamp) - Number(a.timestamp)
        );
        
        setComments(fetchedComments);
        
        // Try to get user profiles for commenters
        try {
          // Use list_profiles from the base actor
          // @ts-ignore - API method exists in backend but types may not be updated
          const profilesResponse = await actor.list_profiles();
          
          // Create a map of principal -> profile for easy lookup
          const profileMap: Record<string, any> = {};
          
          if (profilesResponse && "Ok" in profilesResponse) {
            // Profiles is an array of [principal_string, UserProfile] tuples
            const profiles = profilesResponse.Ok;
            
            profiles.forEach(([principalStr, profile]: [string, any]) => {
              profileMap[principalStr] = profile;
            });
          }
          
          setUserProfiles(profileMap);
        } catch (err) {
          console.error('Error fetching user profiles:', err);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments: ' + (err instanceof Error ? err.message : String(err)));
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [actor, videoId]);

  // Post a new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!actor || !identity || !newCommentText.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const backendActor = actor as unknown as BackendExtended;
      const newComment = await backendActor.post_comment(videoId, newCommentText.trim());
      
      // Add to comments list
      setComments(prev => [newComment, ...prev]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date from timestamp
  const formatDate = (timestamp: bigint) => {
    try {
      return formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  // Find commenter name from profiles
  const getCommenterName = (principal: string) => {
    const profile = userProfiles[principal];
    if (profile && profile.name) {
      return profile.name;
    }
    return 'Unknown User';
  };

  // Find commenter avatar from profiles
  const getCommenterAvatar = (principal: string) => {
    const profile = userProfiles[principal];
    if (profile && profile.avatar_url) {
      return profile.avatar_url;
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow ${className}`}>
      <div className="p-6 border-b dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">
          Comments {comments.length > 0 && `(${formatNumber(comments.length)})`}
        </h2>
        
        {/* Comment Form */}
        {identity ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0">
                {/* User avatar would go here */}
              </div>
              <div className="flex-grow">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={isSubmitting}
                ></textarea>
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCommentText.trim()}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      isSubmitting || !newCommentText.trim()
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="py-4 px-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center mb-6">
            <p className="text-gray-700 dark:text-gray-300">Log in to comment</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 text-red-100 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment, index) => (
              <div key={index} className="flex space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                  {getCommenterAvatar(comment.commenter_principal) ? (
                    <img
                      src={getCommenterAvatar(comment.commenter_principal)}
                      alt={getCommenterName(comment.commenter_principal)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      {getCommenterName(comment.commenter_principal)[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium">{getCommenterName(comment.commenter_principal)}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(comment.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{comment.text}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <button className="flex items-center hover:text-red-500">
                      <FontAwesomeIcon icon={faHeart} className="mr-1" />
                      <span>Like</span>
                    </button>
                    
                    <button className="flex items-center hover:text-blue-500">
                      <FontAwesomeIcon icon={faReply} className="mr-1" />
                      <span>Reply</span>
                    </button>
                    
                    <span className="text-xs">212.8K likes</span>
                    <span className="text-xs">636 replies</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}