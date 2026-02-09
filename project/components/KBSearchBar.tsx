/**
 * KBSearchBar - Global search input component
 * 
 * Provides autocomplete and suggestions for knowledge base search.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchFilters } from '../types/kb';

interface KBSearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  placeholder?: string;
  initialQuery?: string;
  showSuggestions?: boolean;
  debounceMs?: number;
}

/**
 * KBSearchBar component
 */
export function KBSearchBar({
  onSearch,
  placeholder = 'Search knowledge base...',
  initialQuery = '',
  showSuggestions = true,
  debounceMs = 300,
}: KBSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  /**
   * Handle search with debouncing
   */
  const handleSearch = useCallback(
    (searchQuery: string) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set searching state
      setIsSearching(searchQuery.length > 0);

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        if (searchQuery.trim()) {
          onSearch({ query: searchQuery.trim() });
        } else {
          onSearch({ query: '' });
        }
        setIsSearching(false);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  /**
   * Handle query change
   */
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      // Generate suggestions (simple implementation)
      if (showSuggestions && newQuery.length > 2) {
        // This is a simple suggestion implementation
        // In a real app, this would call an API endpoint
        const commonTerms = [
          'how to',
          'troubleshooting',
          'setup',
          'configuration',
          'error',
          'install',
          'update',
          'reset',
          'connection',
        ];
        const filteredSuggestions = commonTerms.filter(term =>
          term.toLowerCase().includes(newQuery.toLowerCase())
        );
        setSuggestions(filteredSuggestions.slice(0, 5));
        setShowSuggestionsDropdown(true);
      } else {
        setSuggestions([]);
        setShowSuggestionsDropdown(false);
      }

      // Trigger search
      handleSearch(newQuery);
    },
    [showSuggestions, handleSearch]
  );

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const fullQuery = `${suggestion} ${query}`;
      setQuery(fullQuery);
      setSuggestions([]);
      setShowSuggestionsDropdown(false);
      handleSearch(fullQuery);
    },
    [query, handleSearch]
  );

  /**
   * Handle clear
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestionsDropdown(false);
    onSearch({ query: '' });
  }, [onSearch]);

  /**
   * Handle key down
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestionsDropdown(false);
      }
    },
    []
  );

  /**
   * Close suggestions when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setShowSuggestionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={searchBarRef}>
      <div className="relative">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />

          {/* Search icon */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Clear button */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Searching indicator */}
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-2">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11z" />
                  </svg>
                  <span className="text-gray-700">{suggestion}</span>
                  <span className="text-gray-400 text-sm">{query}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search tips */}
      {!query && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-gray-900 mb-2">Search tips:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• Use specific keywords</li>
            <li>• Try different spellings</li>
            <li>• Use quotes for exact phrases</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default KBSearchBar;
