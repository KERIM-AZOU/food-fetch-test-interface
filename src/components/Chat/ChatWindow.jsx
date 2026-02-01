import { useRef, useEffect } from 'react';
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

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-grow p-3 sm:p-4">
        <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 animate-fade-in">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-purple-500/20">
            <svg className="w-7 h-7 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-white/90 mb-1.5 sm:mb-2">
            Food Finder
          </h2>

          <p className="text-white/50 text-center text-xs sm:text-sm mb-6 sm:mb-8 max-w-xs">
            Tap the mic and tell me what you'd like to eat. I'll find the best prices across all delivery apps.
          </p>

          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {['Pizza', 'Burger', 'Shawarma', 'Sushi'].map((item) => (
              <span
                key={item}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs sm:text-sm text-white/70 border border-white/10"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-3 sm:p-4 space-y-2 sm:space-y-3">
      {messages.map((msg, index) => (
        <div key={msg.id} className="animate-slide-up">
          <MessageBubble
            type={msg.type}
            content={msg.content}
          />

          {msg.products && msg.products.length > 0 && (
            <div className="mt-3">
              <ProductCarousel products={msg.products} />

              {pagination && pagination.total_products > msg.products.length && (
                <div className="mt-2 text-center">
                  <button
                    onClick={() => handleViewAll(getSearchTermForMessage(index))}
                    className="text-blue-400/80 hover:text-blue-400 text-xs font-medium transition-colors"
                  >
                    View all {pagination.total_products} results
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatWindow;
