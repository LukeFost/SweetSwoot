import { useState, useEffect } from 'react';
import { useActor } from '../../ic/Actors';
import { BackendExtended } from '../../livepeer/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faEthereum } from '@fortawesome/free-brands-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { formatEther } from 'viem';

interface TipRecord {
  from_addr: string;
  to_addr: string;
  video_id: string;
  amount: bigint;
  tx_hash: string;
  timestamp: bigint;
}

interface TipHistoryProps {
  videoId: string;
  className?: string;
}

export function TipHistory({ videoId, className = '' }: TipHistoryProps) {
  const actor = useActor();
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Fetch tip history
  useEffect(() => {
    if (!actor || !videoId) return;
    
    const fetchTips = async () => {
      try {
        setLoading(true);
        const backendActor = actor as unknown as BackendExtended;
        const tipRecords = await backendActor.get_tips_for_video(videoId);
        
        // Sort by timestamp (newest first)
        tipRecords.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        
        setTips(tipRecords);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tip history:', err);
        setError('Failed to load tip history');
        setLoading(false);
      }
    };
    
    fetchTips();
  }, [actor, videoId]);
  
  // Calculate total ETH tipped
  const calculateTotal = () => {
    if (!tips.length) return '0';
    
    const total = tips.reduce((sum, tip) => {
      return sum + BigInt(tip.amount);
    }, BigInt(0));
    
    return formatEther(total);
  };
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format date from timestamp
  const formatDate = (timestamp: bigint) => {
    try {
      return formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };
  
  // If there are no tips, don't show the component
  if (tips.length === 0 && !loading) return null;
  
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-lg shadow ${className}`}>
      {/* Header - always visible */}
      <div 
        className="p-4 border-b dark:border-zinc-800 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faEthereum} className="text-blue-500 mr-2" />
            Tip History
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? 'Loading...' : `${tips.length} tip${tips.length !== 1 ? 's' : ''} • Total: ${calculateTotal()} ETH`}
          </p>
        </div>
        <FontAwesomeIcon 
          icon={expanded ? faChevronUp : faChevronDown} 
          className="text-gray-500 dark:text-gray-400"
        />
      </div>
      
      {/* Expanded content */}
      {expanded && (
        <div className="p-4">
          {loading ? (
            <div className="py-4 flex justify-center">
              <div className="animate-spin h-6 w-6 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-center py-4">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {tips.slice(0, 5).map((tip, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b dark:border-zinc-800 last:border-0">
                  <div>
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEthereum} className="text-blue-500 mr-2" />
                      <span className="font-medium">{formatEther(tip.amount)} ETH</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      From: {formatAddress(tip.from_addr)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(tip.timestamp)}
                    </div>
                    <a
                      href={`https://etherscan.io/tx/${tip.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View transaction
                    </a>
                  </div>
                </div>
              ))}
              
              {tips.length > 5 && (
                <div className="text-center">
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    onClick={(e) => {
                      e.preventDefault();
                      // This could open a full history modal in the future
                    }}
                  >
                    View all {tips.length} tips
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}