import { useEffect, useRef, useState, useCallback } from 'react';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import useChat from '../../hooks/useChat';
import useAIVoice from '../../hooks/useAIVoice';
import useChatStore from '../../store/chatStore';
import './VoiceSphere.css';

// Pre-translated greetings
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

const FOLLOWUP_GREETINGS = {
  en: 'Anything else?',
  ar: 'شيء آخر؟',
  fr: 'Autre chose?',
  es: '¿Algo más?',
  de: 'Noch etwas?',
  it: 'Altro?',
  pt: 'Mais alguma coisa?',
  ru: 'Что-нибудь ещё?',
  zh: '还要别的吗？',
  ja: '他には？',
  ko: '더 필요하신 거 있나요?',
  hi: 'कुछ और?',
  tr: 'Başka?'
};

const VoiceSphere = () => {
  const { status: voiceStatus, transcript, volume, start, stop } = useVoiceRecognition();
  const { handleVoiceInput } = useChat();
  const { speak, isSpeaking } = useAIVoice();
  const { language, sphereState, setSphereState } = useChatStore();

  const hasSpokenRef = useRef(false);
  const lastProcessedRef = useRef('');
  const [isGreeting, setIsGreeting] = useState(false);

  // Determine current state
  const status = voiceStatus === 'listening' ? 'listening' : sphereState;
  const isActive = status === 'listening' || status === 'processing' || isSpeaking || isGreeting;

  // Sync voice status to store
  useEffect(() => {
    if (voiceStatus === 'listening') {
      setSphereState('listening');
    } else if (voiceStatus === 'processing') {
      setSphereState('processing');
    } else if (voiceStatus === 'error') {
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    }
  }, [voiceStatus, setSphereState]);

  // Get greeting
  const getGreeting = useCallback((isFollowUp = false) => {
    const greetings = isFollowUp ? FOLLOWUP_GREETINGS : GREETINGS;
    return greetings[language] || greetings.en;
  }, [language]);

  // Handle transcript
  useEffect(() => {
    if (transcript.final && transcript.final !== lastProcessedRef.current) {
      lastProcessedRef.current = transcript.final;
      handleVoiceInput(transcript.final, transcript.language || 'en');
    }
  }, [transcript.final, transcript.language, handleVoiceInput]);

  const handleClick = async () => {
    // If active, stop everything
    if (status === 'listening' || status === 'processing' || isGreeting) {
      stop();
      setSphereState('idle');
      return;
    }

    setIsGreeting(true);
    const greeting = getGreeting(hasSpokenRef.current);
    hasSpokenRef.current = true;

    await speak(greeting);
    setIsGreeting(false);
    await start();
  };

  // Get state class for styling
  const getStateClass = () => {
    if (isSpeaking || isGreeting) return 'speaking';
    if (status === 'listening') return 'listening';
    if (status === 'processing') return 'processing';
    if (status === 'error') return 'error';
    return 'idle';
  };

  return (
    <div className="voice-sphere-container">
      <button
        className={`voice-sphere ${getStateClass()}`}
        onClick={handleClick}
        style={{ '--volume': volume }}
      >
        {/* Glow effect */}
        <div className="sphere-glow" />

        {/* Main sphere */}
        <div className="sphere-main">
          {/* Idle - Mic icon */}
          {status === 'idle' && !isSpeaking && !isGreeting && (
            <svg className="sphere-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
            </svg>
          )}

          {/* Listening - Animated rings */}
          {status === 'listening' && (
            <div className="listening-indicator">
              <div className="ring ring-1" />
              <div className="ring ring-2" />
              <div className="ring ring-3" />
            </div>
          )}

          {/* Processing - Spinner */}
          {status === 'processing' && !isSpeaking && !isGreeting && (
            <div className="processing-spinner" />
          )}

          {/* Speaking - Sound bars */}
          {(isSpeaking || isGreeting) && (
            <div className="speaking-bars">
              <span /><span /><span /><span /><span />
            </div>
          )}

          {/* Error - Warning icon */}
          {status === 'error' && !isSpeaking && !isGreeting && (
            <svg className="sphere-icon error-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </div>
      </button>

      {/* Status text */}
      {isActive && (
        <p className="status-text">
          {isSpeaking || isGreeting ? 'Speaking...' :
           status === 'listening' ? 'Listening...' :
           status === 'processing' ? 'Processing...' : ''}
        </p>
      )}
    </div>
  );
};

export default VoiceSphere;
