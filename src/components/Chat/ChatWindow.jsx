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

  // Find the last user message to use as search term
  const getSearchTermForMessage = (msgIndex) => {
    for (let i = msgIndex; i >= 0; i--) {
      if (messages[i].type === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  return (
    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Food Finder</h2>
          <p className="text-gray-400">
            Tap the voice sphere below and tell me what you'd like to eat!
          </p>
          <p className="text-gray-500 text-sm mt-4">
            I'll search Snoonu, Rafeeq, and Talabat to find the best deals.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">Try: "pizza"</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">Try: "burger"</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">Try: "shawarma"</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MessageBubble
              type={msg.type}
              content={msg.content}
              timestamp={msg.timestamp}
            />
            {msg.products && msg.products.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ProductCarousel products={msg.products} />

                {/* View All button */}
                {pagination && pagination.total_products > msg.products.length && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => handleViewAll(getSearchTermForMessage(index))}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View all {pagination.total_products} results →
                    </button>
                  </div>
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
