import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceSphere from './components/VoiceSphere/VoiceSphere';
import ChatWindow from './components/Chat/ChatWindow';
import FilterChips from './components/Filters/FilterChips';
import LanguageSelector from './components/LanguageSelector/LanguageSelector';
import ResultsPage from './pages/ResultsPage';
import useChat from './hooks/useChat';
import useChatStore from './store/chatStore';
import './App.css';

function HomePage() {
  const [textInput, setTextInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { handleSearch } = useChat();
  const { isLoading, lastResults, pagination, messages } = useChatStore();
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
    <div className="bg-black text-white min-h-screen flex flex-col relative">
      {/* Siri-like gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-black" />
      {/* Animated background blur effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {/* Header - minimal Siri style */}
      <header className="relative z-50 p-4 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-white/90">Food Finder</h1>
        </div>

        <LanguageSelector />
      </header>
      {/* Filters panel - slides down */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative top-20 z-50 overflow-hidden"
          >
            <div className="px-4 pb-4">
              <FilterChips />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area - takes up most of the screen */}
      <div className="flex-1 relative top-20 z-10 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <ChatWindow />
        </div>

        {/* View All Results button */}
        <AnimatePresence>
          {lastResults.length > 0 && pagination && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-4 py-2 text-center"
            >
              <button
                onClick={handleViewAllResults}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium transition-all border border-white/20"
              >
                View All {pagination.total_products} Results
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom area with floating sphere and input */}
      <div className="relative z-10 pb-6">
        {/* Floating Voice Sphere */}
        <div className="flex justify-center py-4">
          <VoiceSphere />
        </div>

        {/* Text input - subtle, below the sphere */}
        <form onSubmit={handleTextSubmit} className="px-6">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={hasMessages ? "Or type here..." : "Tap the mic or type here..."}
              disabled={isLoading}
              className="w-full bg-white/5 backdrop-blur-sm text-white px-4 py-2.5 pr-10 rounded-full border border-white/10 focus:border-white/30 focus:bg-white/10 focus:outline-none placeholder-white/30 text-sm disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
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
