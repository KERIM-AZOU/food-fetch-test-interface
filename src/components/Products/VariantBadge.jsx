import React from 'react';

const VariantBadge = ({ platform, isLowest }) => {
  const getPlatformStyles = (platform) => {
    const normalized = platform?.toLowerCase() || '';
    switch (normalized) {
      case 'snoonu':
        return {
          bg: 'bg-red-500',
          text: 'Snoonu'
        };
      case 'rafeeq':
        return {
          bg: 'bg-emerald-500',
          text: 'Rafeeq'
        };
      case 'talabat':
        return {
          bg: 'bg-orange-500',
          text: 'Talabat'
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: platform || 'Unknown'
        };
    }
  };

  const styles = getPlatformStyles(platform);

  return (
    <span
      className={`px-2 py-1 text-xs font-bold text-white rounded-md ${styles.bg} ${
        isLowest ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-gray-800' : ''
      }`}
    >
      {styles.text}
      {isLowest && <span className="ml-1">★</span>}
    </span>
  );
};

export default VariantBadge;
