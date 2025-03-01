import React from 'react';
import { useSearch } from '../../context/SearchContext';

interface SearchBarProps {
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const { searchQuery, setSearchQuery, performSearch, clearSearch } = useSearch();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };
  
  return (
    <form onSubmit={handleSearch} className={`flex items-center ${className}`}>
      <input
        type="text"
        placeholder="Search videos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
      >
        Search
      </button>
      {searchQuery && (
        <button
          type="button"
          onClick={clearSearch}
          className="ml-2 px-2 py-2 text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </form>
  );
};