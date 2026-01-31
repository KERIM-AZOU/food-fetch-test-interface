import React, { useState } from 'react';
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
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {/* Platform toggles */}
        {platformOptions.map((platform) => {
          const isActive = platforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? `${platform.color} text-white`
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {platform.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700 mx-1" />

        {/* Location buttons */}
        <button
          onClick={handleGetCurrentLocation}
          className="px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 flex items-center gap-2"
          title="Use my location"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          My Location
        </button>

        <button
          onClick={() => setShowMap(true)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 flex items-center gap-2"
          title="Select location on map"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </button>

        {/* Show current location */}
        <span className="text-xs text-gray-500">
          ({location.lat.toFixed(4)}, {location.lon.toFixed(4)})
        </span>
      </div>

      {/* Map Modal */}
      {showMap && (
        <MapModal
          onClose={() => setShowMap(false)}
          onSelectLocation={(lat, lon) => {
            setLocation({ lat, lon });
            setShowMap(false);
          }}
          initialLocation={location}
        />
      )}
    </>
  );
};

export default FilterChips;
