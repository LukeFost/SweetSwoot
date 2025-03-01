import React, { createContext, useContext, useState } from 'react';
import { useActor } from '../ic/Actors';

// Define VideoMetadata interface locally
interface VideoMetadata {
  video_id: string;
  title: string;
  uploader_principal: any;
  tags: string[];
  storage_ref: string[] | [];
  timestamp: bigint;
}

interface SearchContextType {
  searchQuery: string;
  searchResults: VideoMetadata[];
  isSearching: boolean;
  setSearchQuery: (query: string) => void;
  performSearch: () => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const actor = useActor();

  const performSearch = async () => {
    if (!actor) return;
    
    setIsSearching(true);
    try {
      // Cast actor to any to bypass TypeScript checking
      const backendActor = actor as any;
      
      if (typeof backendActor.search_videos === 'function') {
        const results = await backendActor.search_videos(
          searchQuery,
          [20], // limit to 20 results
          [0]   // start at offset 0
        );
        setSearchResults(results);
      } else {
        console.error('search_videos function not found on actor');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        searchResults,
        isSearching,
        setSearchQuery,
        performSearch,
        clearSearch
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};