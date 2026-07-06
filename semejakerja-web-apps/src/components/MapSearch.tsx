import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Search, MapPin, Star, TrendingUp, X } from 'lucide-react';
import type { Cafe } from '../types/cafe';

interface MapSearchProps {
  cafes: Cafe[];
  onCafeClick: (cafe: Cafe) => void;
}

const MapSearch: React.FC<MapSearchProps> = ({ cafes, onCafeClick }) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Top 3 popular cafes by clicks
      return [...cafes].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 3);
    }
    const lowerQ = query.toLowerCase();
    return cafes.filter(c => 
      c.name.toLowerCase().includes(lowerQ) || 
      c.address.toLowerCase().includes(lowerQ)
    ).slice(0, 5); // Max 5 results for search
  }, [cafes, query]);

  const handleSelect = (cafe: Cafe) => {
    setQuery('');
    setIsOpen(false);
    map.flyTo([cafe.lat, cafe.lng], 16, { animate: true, duration: 1.5 });
    
    // Call the parent handler to open modal and track click
    setTimeout(() => {
      onCafeClick(cafe);
    }, 500); // slight delay to allow map to fly
  };

  return (
    <div ref={wrapperRef} className="absolute top-28 sm:top-36 left-1/2 transform -translate-x-1/2 z-[400] w-[90%] sm:w-[400px]">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          className="w-full bg-white/95 sm:bg-white/90 sm:backdrop-blur-md border border-white shadow-lg rounded-2xl py-3 pl-11 pr-10 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          placeholder="Cari nama cafe atau lokasi..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(true); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white sm:bg-white/95 sm:backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
          {!query.trim() && (
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cafe Populer</span>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Pencarian tidak ditemukan.
              </div>
            ) : (
              results.map((cafe, i) => (
                <div 
                  key={cafe.id}
                  onClick={() => handleSelect(cafe)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors ${i !== results.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cafe.logoColor + '20', color: cafe.logoColor }}>
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{cafe.name}</h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{cafe.address}</p>
                  </div>
                  {!query.trim() && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold">
                        <Star size={10} fill="currentColor" /> {cafe.rating}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{cafe.clicks || 0} views</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSearch;
