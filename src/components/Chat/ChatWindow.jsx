import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import MessageBubble from './MessageBubble';
import ProductCarousel from './ProductCarousel';

const ChatWindow = () => {
  const { messages, pagination } = useChatStore();
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleViewAll = (searchTerm) => {
    navigate(`/results?q=${encodeURIComponent(searchTerm)}`);
  };

  const getSearchTermForMessage = (msgIndex) => {
    for (let i = msgIndex; i >= 0; i--) {
      if (messages[i].type === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  return (
    <div className="flex-grow p-4 space-y-3">
      {/* Empty state - Siri style */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          {/* App icon */}
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.div>

          <motion.h2
            className="text-xl font-semibold text-white/90 mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Food Finder
          </motion.h2>

          <motion.p
            className="text-white/50 text-center text-sm mb-8 max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Tap the mic and tell me what you'd like to eat. I'll find the best prices across all delivery apps.
          </motion.p>

          {/* Suggestion chips - Siri style */}
          <motion.div
            className="flex flex-wrap justify-center gap-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {['Pizza', 'Burger', 'Shawarma', 'Sushi'].map((item, i) => (
              <motion.button
                key={item}
                onClick={() => {
                  const { handleSearch } = require('../../hooks/useChat').default();
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/70 hover:text-white transition-all border border-white/10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                {item}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Messages - Siri style */}
      <AnimatePresence mode="popLayout">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <MessageBubble
              type={msg.type}
              content={msg.content}
              timestamp={msg.timestamp}
            />

            {/* Products */}
            {msg.products && msg.products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-3"
              >
                <ProductCarousel products={msg.products} />

                {/* View All link */}
                {pagination && pagination.total_products > msg.products.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-center"
                  >
                    <button
                      onClick={() => handleViewAll(getSearchTermForMessage(index))}
                      className="text-blue-400/80 hover:text-blue-400 text-xs font-medium"
                    >
                      View all {pagination.total_products} results
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatWindow;
