import React from 'react';
import ProductCard from '../Products/ProductCard';

const ProductCarousel = ({ products }) => {
  return (
    <div className="flex overflow-x-auto space-x-4 p-4">
      {products.map((product, index) => (
        <ProductCard key={index} product={product} />
      ))}
    </div>
  );
};

export default ProductCarousel;