import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import VoiceSphere from './components/VoiceSphere/VoiceSphere';
import ChatWindow from './components/Chat/ChatWindow';
import FilterChips from './components/Filters/FilterChips';
import LanguageSelector from './components/LanguageSelector/LanguageSelector';
import ResultsPage from './pages/ResultsPage';
import useChat from './hooks/useChat';
import useChatStore from './store/chatStore';

// Base styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: #000;
      -webkit-tap-highlight-color: transparent;
    }
    * { box-sizing: border-box; }
    input { font-size: 16px !important; }
  `;
  document.head.appendChild(style);
}

function HomePage() {
  const [textInput, setTextInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { handleSearch } = useChat();
  const { isLoading, lastResults, pagination, messages, region, setRegion } = useChatStore();
  const navigate = useNavigate();

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && !isLoading) {
      handleSearch(textInput.trim());
      setTextInput('');
    }
  };

  const handleViewAllResults = () => {
    const storeMessages = useChatStore.getState().messages;
    const lastUserMessage = [...storeMessages].reverse().find(m => m.type === 'user');
    if (lastUserMessage) {
      navigate(`/results?q=${encodeURIComponent(lastUserMessage.content)}`);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="bg-black text-white fixed inset-0 overflow-hidden">
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-black" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 flex items-center justify-between bg-black/80 backdrop-blur-sm">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-white/90">Food Finder</h1>

        <LanguageSelector />
      </header>

      {/* Filters panel */}
      <div
        className={`fixed top-12 sm:top-14 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm transition-all duration-200 overflow-hidden ${
          showFilters ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-1">
          {/* Region selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/50 text-xs">Region</span>
            <div className="flex rounded-full overflow-hidden border border-white/10">
              {[
                { value: 'qatar', label: '🇶🇦 Qatar' },
                { value: 'turkey', label: '🇹🇷 Turkey' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRegion(value)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    region === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <FilterChips />
        </div>
      </div>

      {/* Main scrollable area */}
      <main
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{
          paddingTop: showFilters ? '7rem' : '3.5rem',
          paddingBottom: '10rem'
        }}
      >
        <div className="relative z-10">
          <ChatWindow />

          {/* View All Results button */}
          {lastResults.length > 0 && pagination && (
            <div className="px-3 sm:px-4 py-2 text-center animate-fade-in">
              <button
                onClick={handleViewAllResults}
                className="px-4 sm:px-5 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-medium transition-all border border-white/20"
              >
                View All {pagination.total_products} Results
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-4 sm:pb-6 bg-gradient-to-t from-black via-black/95 to-transparent pt-4">
        <div className="flex justify-center py-2 sm:py-3">
          <VoiceSphere />
        </div>

        <form onSubmit={handleTextSubmit} className="px-4 sm:px-6">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={hasMessages ? "Or type here..." : "Tap the mic or type here..."}
              disabled={isLoading}
              className="w-full bg-white/5 backdrop-blur-sm text-white px-3 sm:px-4 py-2 sm:py-2.5 pr-9 sm:pr-10 rounded-full border border-white/10 focus:border-white/30 focus:bg-white/10 focus:outline-none placeholder-white/30 text-xs sm:text-sm disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>

        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
}

export default App;
