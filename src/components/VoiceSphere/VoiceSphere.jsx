import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import useChat from '../../hooks/useChat';
import useAIVoice from '../../hooks/useAIVoice';
import useChatStore from '../../store/chatStore';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

// Timeout for processing state (15 seconds max)
const PROCESSING_TIMEOUT = 15000;

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

// Follow-up greetings for subsequent orders
const FOLLOWUP_GREETINGS = {
  en: 'Wanna order anything else?',
  ar: 'هل تريد طلب شيء آخر؟',
  fr: 'Voulez-vous commander autre chose?',
  es: '¿Quieres pedir algo más?',
  de: 'Möchtest du noch etwas bestellen?',
  it: 'Vuoi ordinare qualcos\'altro?',
  pt: 'Quer pedir mais alguma coisa?',
  ru: 'Хотите заказать что-нибудь еще?',
  zh: '还要点别的吗？',
  ja: '他に何か注文しますか？',
  ko: '다른 것도 주문하시겠습니까?',
  hi: 'कुछ और ऑर्डर करना चाहेंगे?',
  tr: 'Başka bir şey sipariş etmek ister misin?'
};

const VoiceSphere = () => {
  const { status: voiceStatus, error, transcript, volume, start, stop } = useVoiceRecognition();
  const { handleVoiceInput } = useChat();
  const { speak, isSpeaking } = useAIVoice();
  const { language, sphereState, setSphereState } = useChatStore();
  const hasSpokenRef = useRef(false);
  const lastProcessedRef = useRef('');
  const [isGreeting, setIsGreeting] = useState(false);
  const processingTimeoutRef = useRef(null);

  // Compute effective status
  const status = voiceStatus === 'listening' ? 'listening' : sphereState;
  const isActive = status === 'listening' || status === 'processing' || isSpeaking || isGreeting;

  // Sync voice recognition status to store and add timeout protection
  useEffect(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    if (voiceStatus === 'listening') {
      setSphereState('listening');
    } else if (voiceStatus === 'processing') {
      setSphereState('processing');
      processingTimeoutRef.current = setTimeout(() => {
        console.warn('Processing timeout - resetting to idle');
        setSphereState('idle');
      }, PROCESSING_TIMEOUT);
    } else if (voiceStatus === 'error') {
      setSphereState('error');
    }

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [voiceStatus, setSphereState]);

  // Get greeting in selected language
  const getGreeting = useCallback(async (isFollowUp = false) => {
    const greetings = isFollowUp ? FOLLOWUP_GREETINGS : GREETINGS;
    if (greetings[language]) {
      return greetings[language];
    }

    try {
      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isFollowUp ? 'followup' : 'greeting',
          language,
          text: isFollowUp ? 'Wanna order anything else?' : undefined
        })
      });
      const result = await response.json();
      return result.translated || greetings.en;
    } catch {
      return greetings.en;
    }
  }, [language]);

  // When a final transcript is ready, send it to the chat handler
  useEffect(() => {
    if (transcript.final && transcript.final !== lastProcessedRef.current) {
      lastProcessedRef.current = transcript.final;
      handleVoiceInput(transcript.final, transcript.language || 'en');
    }
  }, [transcript.final, transcript.language, handleVoiceInput]);

  const handleClick = async () => {
    if (status === 'listening' || status === 'processing' || isGreeting) {
      stop();
      setSphereState('idle');
      return;
    }

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    setIsGreeting(true);

    const isFollowUp = hasSpokenRef.current;
    hasSpokenRef.current = true;

    const greeting = await getGreeting(isFollowUp);
    await speak(greeting);

    setIsGreeting(false);
    await start();
  };

  // Siri-like gradient colors based on state
  const getGradientColors = () => {
    if (isSpeaking || isGreeting) {
      return ['#22c55e', '#3b82f6', '#8b5cf6', '#22c55e'];
    }
    if (status === 'listening') {
      return ['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'];
    }
    if (status === 'processing') {
      return ['#8b5cf6', '#ec4899', '#f59e0b', '#8b5cf6'];
    }
    if (status === 'error') {
      return ['#ef4444', '#f97316', '#ef4444', '#f97316'];
    }
    // Idle - subtle blue/purple
    return ['#1e40af', '#3b82f6', '#8b5cf6', '#1e40af'];
  };

  const colors = getGradientColors();

  return (
    <div className="flex flex-col items-center">
      {/* Floating Siri-like blob */}
      <motion.div
        className="relative cursor-pointer"
        onClick={handleClick}
        animate={{
          scale: isActive ? 1.15 : 1,
        }}
        whileHover={{ scale: isActive ? 1.15 : 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          }}
          animate={{
            opacity: isActive ? 0.6 : 0.3,
            scale: isActive ? 1.3 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Main sphere - Siri style */}
        <motion.div
          className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]})`,
            backgroundSize: '300% 300%',
          }}
          animate={{
            backgroundPosition: isActive ? ['0% 50%', '100% 50%', '0% 50%'] : '50% 50%',
          }}
          transition={{
            backgroundPosition: {
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />

          {/* Animated waves for listening */}
          {status === 'listening' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1 + volume * 0.3, 1] }}
              transition={{ duration: 0.15 }}
            >
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20" />
            </motion.div>
          )}

          {/* Processing spinner */}
          {status === 'processing' && !isSpeaking && !isGreeting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}

          {/* Speaking waves */}
          {(isSpeaking || isGreeting) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="flex items-end justify-center gap-0.5 h-5 sm:h-6"
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 sm:w-1 bg-white/80 rounded-full"
                    animate={{ height: ['6px', '16px', '6px'] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {/* Idle microphone icon */}
          {status === 'idle' && !isSpeaking && !isGreeting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
              </svg>
            </div>
          )}

          {/* Error icon */}
          {status === 'error' && !isSpeaking && !isGreeting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Status text - only show when active */}
      <AnimatePresence>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 sm:mt-3 text-white/70 text-[10px] sm:text-xs font-medium"
          >
            {isSpeaking || isGreeting
              ? 'Speaking...'
              : status === 'listening'
              ? 'Listening...'
              : status === 'processing'
              ? 'Processing...'
              : ''}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Transcript preview */}
      <AnimatePresence>
        {status === 'listening' && transcript.interim && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 sm:mt-2 text-white/60 text-xs sm:text-sm max-w-[180px] sm:max-w-[200px] text-center truncate"
          >
            "{transcript.interim}"
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceSphere;
