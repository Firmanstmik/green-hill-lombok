import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, MapPin } from '@/icons/iconsax';
import { geocodeAddress, GeocodingResult } from '@/lib/mapbox';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: GeocodingResult) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 3) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function getSecondaryLine(suggestion: GeocodingResult): string {
  const parts: string[] = [];
  if (suggestion.city) parts.push(suggestion.city);
  if (suggestion.country) parts.push(suggestion.country);
  return parts.join(', ');
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your property address...',
  error,
  disabled = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showUnconfirmed, setShowUnconfirmed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Debounced fetch with stale-request cancellation
  const fetchSuggestions = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current;

    try {
      const results = await geocodeAddress(query);

      // Ignore stale responses
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setHighlightedIndex(-1);

      if (results.length === 0) {
        setApiError('No matches found. You may enter the address manually.');
      } else {
        setApiError(null);
      }
      setIsLoading(false);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setApiError('Address lookup temporarily unavailable.');
      setSuggestions([]);
      setIsLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    setIsVerified(false);
    setShowUnconfirmed(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (val.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      setApiError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Mark as unconfirmed if user has typed enough but didn't select
        if (value && value.length >= 3 && !isVerified) {
          setShowUnconfirmed(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, isVerified]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter' && value && value.length >= 3 && suggestions.length > 0) {
        setShowDropdown(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    onChange(suggestion.formattedAddress);
    onSelect(suggestion);
    setIsVerified(true);
    setShowUnconfirmed(false);
    setShowDropdown(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    setApiError(null);
  };

  const handleBlur = () => {
    // Small delay to allow click on suggestion to fire first
    setTimeout(() => {
      if (value && value.length >= 3 && !isVerified) {
        setShowUnconfirmed(true);
      }
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* Location pin icon */}
        <MapPin
          size={15}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 z-10 pointer-events-none"
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            setShowUnconfirmed(false);
            if (value && value.length >= 3 && suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          aria-expanded={showDropdown}
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
          className={cn(
            'w-full pl-10 pr-10 h-14 rounded-2xl bg-secondary/5 font-medium text-sm',
            'border focus:outline-none focus:ring-2 focus:ring-[#17382e]/15',
            'transition-colors duration-150 disabled:opacity-50 placeholder:text-muted-foreground/50',
            error
              ? 'border-brand-danger ring-1 ring-brand-danger'
              : 'border-border hover:border-border/80'
          )}
        />

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 size={15} className="text-muted-foreground/40 animate-spin" />
          </div>
        )}
      </div>

      {/* Status line */}
      {!error && (
        <div className="mt-1 ml-1 h-4">
          {isVerified && (
            <p className="text-xs text-foreground/50">Location confirmed</p>
          )}
          {showUnconfirmed && !isVerified && (
            <p className="text-xs text-foreground/40">Select from suggestions to confirm</p>
          )}
          {apiError && !showDropdown && value.length >= 3 && !isVerified && (
            <p className="text-xs text-muted-foreground/70">{apiError}</p>
          )}
        </div>
      )}

      {/* Form validation error */}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
          <AlertCircle size={12} className="text-brand-danger flex-shrink-0" />
          <p className="text-xs text-brand-danger">{error}</p>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border/40 rounded-2xl shadow-sm z-50 overflow-hidden animate-fade-in"
        >
          {suggestions.map((suggestion, index) => {
            const secondary = getSecondaryLine(suggestion);
            return (
              <li
                key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(e) => {
                  // Prevent blur from firing before click
                  e.preventDefault();
                  handleSelectSuggestion(suggestion);
                }}
                className={cn(
                  'px-4 py-3.5 cursor-pointer transition-colors duration-100',
                  'border-b border-border/15 last:border-b-0',
                  index === highlightedIndex
                    ? 'bg-secondary/15'
                    : 'hover:bg-secondary/8'
                )}
              >
                <p className="text-sm text-foreground leading-snug">
                  {highlightMatch(suggestion.formattedAddress, value)}
                </p>
                {secondary && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{secondary}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
