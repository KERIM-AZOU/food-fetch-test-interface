import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useChatStore from '../store/chatStore';
import ProductCard from '../components/Products/ProductCard';
import FilterChips from '../components/Filters/FilterChips';
import { search } from '../services/api';

const ResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    lastResults,
    setLastResults,
    pagination,
    setPagination,
    allRestaurants,
    setAllRestaurants,
    filters,
    platforms,
    location
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentPage = parseInt(searchParams.get('page') || '1');
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      setSearchTerm(query);
      fetchResults(query, currentPage);
    }
  }, [query, currentPage, filters.sort, platforms]);

  const fetchResults = async (term, page) => {
    setIsLoading(true);
    try {
      const result = await search({
        term,
        lat: location.lat,
        lon: location.lon,
        page,
        platforms,
        ...filters
      });

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ q: query, page: newPage.toString() });
    // Scroll the main content container to top
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim(), page: '1' });
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.total_pages <= 1) return null;

    const pages = [];
    const { current_page, total_pages } = pagination;

    // Always show first page
    pages.push(1);

    // Show ellipsis if needed
    if (current_page > 3) {
      pages.push('...');
    }

    // Show pages around current
    for (let i = Math.max(2, current_page - 1); i <= Math.min(total_pages - 1, current_page + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    // Show ellipsis if needed
    if (current_page < total_pages - 2) {
      pages.push('...');
    }

    // Always show last page
    if (total_pages > 1 && !pages.includes(total_pages)) {
      pages.push(total_pages);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(current_page - 1)}
          disabled={!pagination.has_prev}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          Previous
        </button>

        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-10 h-10 rounded-lg ${
                page === current_page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => handlePageChange(current_page + 1)}
          disabled={!pagination.has_next}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="h-screen h-[100dvh] bg-gradient-to-b from-gray-900 to-black text-white flex flex-col overflow-hidden">
      {/* Header - fixed at top */}
      <header className="flex-shrink-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for food..."
                  className="w-full bg-gray-800 text-white px-4 py-3 pr-12 rounded-full border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Filters */}
          <div className="mt-4 overflow-x-auto">
            <FilterChips />
          </div>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results info */}
        {pagination && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-400">
              Showing {lastResults.length} of {pagination.total_products} results for "{query}"
            </p>
            <p className="text-gray-500 text-sm">
              Page {pagination.current_page} of {pagination.total_pages}
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* Results grid */}
        {!isLoading && lastResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {lastResults.map((product, index) => (
              <motion.div
                key={`${product.product_name}-${product.restaurant_name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* No results */}
        {!isLoading && lastResults.length === 0 && query && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No results found for "{query}"</p>
            <p className="text-gray-500 mt-2">Try a different search term</p>
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
