import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import useChatStore from '../../store/chatStore';
import MapModal from './MapModal';

const FilterChips = () => {
  const { platforms, togglePlatform, location, setLocation } = useChatStore();
  const [showMap, setShowMap] = useState(false);

  const platformOptions = [
    { id: 'snoonu', label: 'Snoonu', color: 'bg-red-500' },
    { id: 'rafeeq', label: 'Rafeeq', color: 'bg-emerald-500' },
    { id: 'talabat', label: 'Talabat', color: 'bg-orange-500' }
  ];

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please select manually on the map.');
          setShowMap(true);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center items-center">
        {/* Platform toggles */}
        {platformOptions.map((platform) => {
          const isActive = platforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                isActive
                  ? `${platform.color} text-white`
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {platform.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-1" />

        {/* Location buttons */}
        <button
          onClick={handleGetCurrentLocation}
          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-white/10 text-white/60 hover:bg-white/20 flex items-center gap-1 sm:gap-1.5 transition-all"
          title="Use my location"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          GPS
        </button>

        <button
          onClick={() => setShowMap(true)}
          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-white/10 text-white/60 hover:bg-white/20 flex items-center gap-1 sm:gap-1.5 transition-all"
          title="Select location on map"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </button>
      </div>

      {/* Map Modal - rendered in portal to ensure it's on top */}
      {showMap && createPortal(
        <MapModal
          onClose={() => setShowMap(false)}
          onSelectLocation={(lat, lon) => {
            setLocation({ lat, lon });
            setShowMap(false);
          }}
          initialLocation={location}
        />,
        document.body
      )}
    </>
  );
};

export default FilterChips;
