const MessageBubble = ({ type, content }) => {
  if (type === 'user') {
    return (
      <div className="flex justify-end mb-1.5 sm:mb-2">
        <div className="max-w-[85%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-500 text-white">
          <p className="text-xs sm:text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="flex justify-start mb-1.5 sm:mb-2">
        <div className="max-w-[85%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-500/30">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p className="text-xs sm:text-sm text-red-300 leading-relaxed">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Bot message
  return (
    <div className="flex justify-start mb-1.5 sm:mb-2">
      <div className="max-w-[85%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
        <p className="text-xs sm:text-sm text-white/90 leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
