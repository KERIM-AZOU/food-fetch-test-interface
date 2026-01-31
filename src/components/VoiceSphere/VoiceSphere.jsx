import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import useChat from '../../hooks/useChat';
import useAIVoice from '../../hooks/useAIVoice';
import useChatStore from '../../store/chatStore';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

// Pre-translated greetings for instant response
const GREETINGS = {
  en: 'What would you like to order today?',
  ar: 'ماذا تريد أن تطلب اليوم؟',
  fr: 'Que souhaitez-vous commander aujourd\'hui?',
  es: '¿Qué te gustaría pedir hoy?',
  de: 'Was möchten Sie heute bestellen?',
  it: 'Cosa vorresti ordinare oggi?',
  pt: 'O que você gostaria de pedir hoje?',
  ru: 'Что бы вы хотели заказать сегодня?',
  zh: '你今天想点什么？',
  ja: '今日は何を注文しますか？',
  ko: '오늘 무엇을 주문하시겠습니까?',
  hi: 'आज आप क्या ऑर्डर करना चाहेंगे?',
  tr: 'Bugün ne sipariş etmek istersiniz?'
};

const VoiceSphere = () => {
  const { status, error, transcript, volume, start, stop } = useVoiceRecognition();
  const { handleVoiceInput } = useChat();
  const { speak, isSpeaking } = useAIVoice();
  const { language } = useChatStore();
  const hasSpokenRef = useRef(false);
  const lastProcessedRef = useRef('');
  const [isGreeting, setIsGreeting] = useState(false);

  // Get greeting in selected language
  const getGreeting = useCallback(async () => {
    // Use pre-translated greeting if available
    if (GREETINGS[language]) {
      return GREETINGS[language];
    }

    // Otherwise fetch from backend
    try {
      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'greeting', language })
      });
      const result = await response.json();
      return result.translated || GREETINGS.en;
    } catch {
      return GREETINGS.en;
    }
  }, [language]);

  // When a final transcript is ready, send it to the chat handler (only once)
  useEffect(() => {
    if (transcript.final && transcript.final !== lastProcessedRef.current) {
      lastProcessedRef.current = transcript.final;
      // Pass the detected language along with the transcript
      handleVoiceInput(transcript.final, transcript.language || 'en');
    }
  }, [transcript.final, transcript.language, handleVoiceInput]);

  const handleClick = async () => {
    if (status === 'listening' || status === 'processing' || isGreeting) {
      stop();
      return;
    }

    // First time: speak greeting, then start recording
    if (!hasSpokenRef.current) {
      hasSpokenRef.current = true;
      setIsGreeting(true);

      // Get and speak greeting in selected language
      const greeting = await getGreeting();
      await speak(greeting);

      setIsGreeting(false);
      // Now start recording after greeting is done
      await start();
    } else {
      // Subsequent clicks: just start recording
      await start();
    }
  };

  const getStateStyles = () => {
    // AI is speaking
    if (isSpeaking || isGreeting) {
      return {
        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)',
        boxShadow: '0 0 60px rgba(16, 185, 129, 0.6), 0 0 100px rgba(59, 130, 246, 0.4)'
      };
    }

    switch (status) {
      case 'listening':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          boxShadow: `0 0 60px rgba(59, 130, 246, 0.6), 0 0 100px rgba(139, 92, 246, 0.4), 0 0 120px rgba(236, 72, 153, ${volume * 0.5})`
        };
      case 'processing':
      case 'model_loading':
        return {
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
          boxShadow: '0 0 60px rgba(139, 92, 246, 0.6), 0 0 100px rgba(236, 72, 153, 0.4)'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.6)'
        };
      default: // idle
        return {
          background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 50%, #8b5cf6 100%)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)'
        };
    }
  };
  
  const getAnimation = () => {
    // AI is speaking - pulsing animation
    if (isSpeaking || isGreeting) {
      return {
        scale: [1, 1.08, 1],
        transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
      };
    }

    switch (status) {
      case 'listening':
        return {
          scale: 1 + (volume * 0.15),
          transition: { type: 'spring', stiffness: 400, damping: 10 }
        };
      case 'processing':
      case 'model_loading':
        return {
          rotate: [0, 360],
          scale: [1, 1.05, 1],
          transition: {
            rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          }
        };
      case 'error':
        return {
          x: [-2, 2, -2, 2, 0],
          transition: { duration: 0.4 }
        };
      default: // idle
        return {
          scale: [1, 1.02, 1],
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        };
    }
  };

  const getStatusText = () => {
      // AI is speaking
      if (isSpeaking || isGreeting) return 'Speaking...';

      switch(status) {
        case 'idle': return 'Tap to speak';
        case 'listening': return 'Listening...';
        case 'processing': return 'Processing...';
        case 'model_loading': return 'Loading speech model...';
        case 'error': return error || 'An error occurred. Tap to try again.';
        default: return '';
      }
  }

  return (
    <div className="relative flex flex-col items-center" style={{ minHeight: '250px' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Animated outer glows */}
      </div>

      <motion.div
        className="w-40 h-40 rounded-full cursor-pointer relative z-10 flex items-center justify-center text-white"
        style={getStateStyles()}
        animate={getAnimation()}
        onClick={handleClick}
        whileHover={{ scale: status === 'idle' ? 1.05 : 1 }}
        whileTap={{ scale: status === 'idle' ? 0.95 : 1 }}
      >
        <div
          className="absolute w-32 h-32 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent S60%)' }}
        />

        {/* AI Speaking indicator */}
        {(isSpeaking || isGreeting) && (
          <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}

        {status === 'listening' && !isSpeaking && !isGreeting && (
             <div className="w-16 h-16 flex items-center justify-center">
                 <motion.div
                     className="w-full h-full bg-white/20 rounded-full"
                     animate={{ scale: [1, 1 + volume * 0.5, 1] }}
                     transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
                 />
            </div>
        )}

        {(status === 'processing' || status === 'model_loading') && !isSpeaking && !isGreeting && (
            <motion.div
              className="w-12 h-12 border-4 border-white/30 border-t-white/80 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
        )}

        {(status === 'idle' || status === 'error') && !isSpeaking && !isGreeting && (
          <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z"/>
          </svg>
        )}
      </motion.div>

      <motion.p
        className="mt-6 text-gray-400 text-sm font-medium h-5 text-center"
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {getStatusText()}
      </motion.p>

      {status === 'listening' && transcript.interim && (
        <motion.p
          className="mt-2 text-gray-300 text-base max-w-xs text-center h-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          "{transcript.interim}"
        </motion.p>
      )}
    </div>
  );
};

export default VoiceSphere;
