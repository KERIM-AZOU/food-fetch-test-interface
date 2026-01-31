import React from 'react';
import VariantBadge from './VariantBadge';

const ProductCard = ({ product }) => {
  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    return `${price.toFixed(2)} QAR`;
  };

  return (
    <div className="bg-gray-800 rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex-shrink-0 w-52 sm:w-72 hover:bg-gray-750 transition-colors">
      {/* Product Image */}
      {product.product_image && (
        <div className="relative mb-2 sm:mb-3">
          <img
            src={product.product_image}
            alt={product.product_name}
            className="w-full h-24 sm:h-36 object-cover rounded-md sm:rounded-lg"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {product.has_comparison && (
            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
              {product.platform_count} platforms
            </span>
          )}
        </div>
      )}

      {/* Product Info */}
      <h3 className="text-sm sm:text-lg font-semibold text-white truncate" title={product.product_name}>
        {product.product_name}
      </h3>

      <p className="text-gray-400 text-xs sm:text-sm truncate mb-2 sm:mb-3" title={product.restaurant_name}>
        {product.restaurant_name}
      </p>

      {/* Lowest Price */}
      {product.lowest_price && (
        <div className="mb-2 sm:mb-3">
          <span className="text-green-400 font-bold text-base sm:text-xl">
            {formatPrice(product.lowest_price)}
          </span>
          <span className="text-gray-500 text-xs sm:text-sm ml-1 sm:ml-2">lowest</span>
        </div>
      )}

      {/* Variants */}
      <div className="space-y-1.5 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
        {product.variants?.map((variant, index) => (
          <a
            key={index}
            href={variant.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between items-center p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <VariantBadge platform={variant.source} isLowest={variant.is_lowest} />
              <span className="text-gray-400 text-[10px] sm:text-xs">{variant.restaurant_eta}</span>
            </div>
            <span className={`font-medium text-xs sm:text-sm ${variant.is_lowest ? 'text-green-400' : 'text-white'}`}>
              {formatPrice(variant.price)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ProductCard;
