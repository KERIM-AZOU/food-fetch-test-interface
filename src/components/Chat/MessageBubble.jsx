import React from 'react';

const MessageBubble = ({ type, content, timestamp }) => {
  const isUser = type === 'user';
  const isError = type === 'error';

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-blue-600 text-white ml-auto';
    }
    if (isError) {
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    }
    return 'bg-gray-800 text-white';
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${getBubbleStyles()}`}>
        <p className="text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            {formatTime(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
