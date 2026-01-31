import React from 'react';
import { motion } from 'framer-motion';

const MessageBubble = ({ type, content, timestamp }) => {
  const isUser = type === 'user';
  const isError = type === 'error';
  const isBot = type === 'bot';

  // Siri-style: user messages on the right, bot responses centered or left
  if (isUser) {
    return (
      <div className="flex justify-end mb-2">
        <motion.div
          className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-blue-500 text-white"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </motion.div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-start mb-2">
        <motion.div
          className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-500/30"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p className="text-sm text-red-300 leading-relaxed">{content}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Bot message - Siri style with glass effect
  return (
    <div className="flex justify-start mb-2">
      <motion.div
        className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <p className="text-sm text-white/90 leading-relaxed">{content}</p>
      </motion.div>
    </div>
  );
};

export default MessageBubble;
