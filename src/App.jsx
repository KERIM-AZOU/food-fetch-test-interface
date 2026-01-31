import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
  const { handleSearch } = useChat();
  const { isLoading, lastResults, pagination } = useChatStore();
  const navigate = useNavigate();

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && !isLoading) {
      handleSearch(textInput.trim());
      setTextInput('');
    }
  };

  const handleViewAllResults = () => {
    // Get the last search term from messages
    const messages = useChatStore.getState().messages;
    const lastUserMessage = [...messages].reverse().find(m => m.type === 'user');
    if (lastUserMessage) {
      navigate(`/results?q=${encodeURIComponent(lastUserMessage.content)}`);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black text-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Food Finder
            </h1>
            <p className="text-gray-500 text-xs">Compare prices across Snoonu, Rafeeq & Talabat</p>
          </div>
          <div className="flex-1 flex justify-end">
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ChatWindow />
        </div>

        {/* View All Results button */}
        {lastResults.length > 0 && pagination && (
          <div className="px-4 py-2 text-center">
            <button
              onClick={handleViewAllResults}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              View All {pagination.total_products} Results
            </button>
          </div>
        )}

        {/* Filter chips */}
        <div className="px-4 py-3 border-t border-gray-800/50">
          <FilterChips />
        </div>

        {/* Voice sphere */}
        <div className="flex justify-center items-center py-6">
          <VoiceSphere />
        </div>

        {/* Text input fallback */}
        <form onSubmit={handleTextSubmit} className="px-4 pb-4">
          <div className="relative">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type what you're looking for..."
              disabled={isLoading}
              className="w-full bg-gray-800 text-white px-4 py-3 pr-12 rounded-full border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
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
