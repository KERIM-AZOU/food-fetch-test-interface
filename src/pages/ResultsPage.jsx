import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    setAllRestaurants,
    filters,
    platforms,
    location,
    region,
    language
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
        region,
        language,
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

    const { current_page, total_pages } = pagination;
    const pages = [];

    pages.push(1);
    if (current_page > 3) pages.push('...');

    for (let i = Math.max(2, current_page - 1); i <= Math.min(total_pages - 1, current_page + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (current_page < total_pages - 2) pages.push('...');
    if (total_pages > 1 && !pages.includes(total_pages)) pages.push(total_pages);

    return (
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
        <button
          onClick={() => handlePageChange(current_page - 1)}
          disabled={!pagination.has_prev}
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-800 text-white text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Prev
        </button>

        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 sm:px-2 text-gray-500 text-xs sm:text-sm">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm transition-colors ${
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
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-800 text-white text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full bg-gray-800 text-white text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 rounded-full border border-gray-700 focus:border-blue-500 focus:outline-none"
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="submit"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-2.5 sm:mt-4 overflow-x-auto">
            <FilterChips />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{ paddingTop: '6.5rem', paddingBottom: '1rem' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Results info */}
          {pagination && (
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <p className="text-gray-400 text-xs sm:text-base">
                Showing {lastResults.length} of {pagination.total_products} results for "{query}"
              </p>
              <p className="text-gray-500 text-[10px] sm:text-sm">
                Page {pagination.current_page} of {pagination.total_pages}
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 sm:py-20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Results grid */}
          {!isLoading && lastResults.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4">
              {lastResults.map((product, index) => (
                <div key={`${product.product_name}-${product.restaurant_name}-${index}`}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && lastResults.length === 0 && query && (
            <div className="text-center py-16 sm:py-20">
              <p className="text-gray-400 text-sm sm:text-lg">No results found for "{query}"</p>
              <p className="text-gray-500 mt-1.5 sm:mt-2 text-xs sm:text-base">Try a different search term</p>
            </div>
          )}

          {renderPagination()}

          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
