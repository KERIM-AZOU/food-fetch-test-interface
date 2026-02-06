import { useEffect, useRef, useState } from 'react';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import useChat from '../../hooks/useChat';
import useAIVoice from '../../hooks/useAIVoice';
import useChatStore from '../../store/chatStore';
import './VoiceSphere.css';

const VoiceSphere = () => {
  const { status: voiceStatus, transcript, audioData, volume, start, stop, clearAudioData } = useVoiceRecognition();
  const { handleVoiceInput, handleAudioInput, initChat } = useChat();
  const { stop: stopAudio } = useAIVoice();
  const { sphereState, setSphereState, conversationActive, setConversationActive, isSpeaking } = useChatStore();

  const hasInitializedRef = useRef(false);
  const lastProcessedRef = useRef('');
  const lastProcessedAudioRef = useRef(null);
  const isProcessingRef = useRef(false);
  const discardNextAudioRef = useRef(false); // Flag to ditch audio on manual stop
  const wasSpeakingRef = useRef(false);
  const autoListenTimerRef = useRef(null);
  const startRef = useRef(start);
  startRef.current = start; // Always keep ref in sync
  const [isGreeting, setIsGreeting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

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

  // Core auto-listening logic: When the AI stops speaking, start listening.
  useEffect(() => {
    // Update the ref with the current speaking state for the next render
    const wasSpeaking = wasSpeakingRef.current;
    wasSpeakingRef.current = isSpeaking;

    // Check if the AI was speaking and has now stopped
    if (wasSpeaking && !isSpeaking) {
      // If conversation is active, automatically start listening again
      if (conversationActive && hasInitializedRef.current && !isProcessingRef.current) {
        // Clear any existing timer
        if (autoListenTimerRef.current) {
          clearTimeout(autoListenTimerRef.current);
        }
        // Start listening after a short delay to avoid capturing echo
        autoListenTimerRef.current = setTimeout(() => {
          console.log('Auto-reactivating listening...');
          // startRef.current();
        }, 200); // 200ms delay
      }
    }
  }, [isSpeaking, conversationActive]);


  // Handle audio data (Native Audio mode - voice-to-voice)
  useEffect(() => {
    // Discard audio if manual stop was triggered
    if (audioData?.base64 && discardNextAudioRef.current) {
      discardNextAudioRef.current = false;
      clearAudioData();
      return;
    }

    // Don't process if: no data, already processing, or AI is speaking
    if (!audioData?.base64 || isProcessingRef.current || isSpeaking) {
      if (audioData?.base64 && isSpeaking) {
        console.log('Discarding audio (recorded during AI speech)');
        clearAudioData();
      }
      return;
    }

    // Check if this is new audio
    if (audioData.base64 !== lastProcessedAudioRef.current) {
      isProcessingRef.current = true;
      lastProcessedAudioRef.current = audioData.base64;
      const audioToProcess = audioData.base64;
      const mimeToProcess = audioData.mimeType;
      clearAudioData();

      // Process audio and reset lock when done
      handleAudioInput(audioToProcess, mimeToProcess)
        .finally(() => {
          if (isStopping) {
            console.log('Stopping flag is set, not auto-listening.');
            return;
          }
          isProcessingRef.current = false;
          // Auto-listen after processing completes (search or not)
          const { conversationActive } = useChatStore.getState();
          if (conversationActive && hasInitializedRef.current) {
            if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
            autoListenTimerRef.current = setTimeout(() => {
              // startRef.current();
            }, 300);
          }
        });
    }
  }, [audioData, handleAudioInput, clearAudioData, isSpeaking, isStopping]);

  // Handle transcript (fallback for legacy mode)
  useEffect(() => {
    if (transcript.final && transcript.final !== lastProcessedRef.current) {
      lastProcessedRef.current = transcript.final;
      handleVoiceInput(transcript.final, transcript.language || 'en');
    }
  }, [transcript.final, transcript.language, handleVoiceInput]);

  const handleClick = async () => {
    // If active, stop everything and deactivate conversation loop
    if (status === 'listening' || status === 'processing' || isGreeting || isSpeaking) {
      setIsStopping(true); // Set stopping flag
      setTimeout(() => setIsStopping(false), 500); // Reset after a moment

      setConversationActive(false);
      discardNextAudioRef.current = true; // Ditch any audio from the stopped recording
      if (autoListenTimerRef.current) {
        clearTimeout(autoListenTimerRef.current);
        autoListenTimerRef.current = null;
      }
      stopAudio();
      stop();
      clearAudioData();
      setSphereState('idle');
      return;
    }

    // Re-enable conversation loop when user manually clicks
    setConversationActive(true);

    // First click: initialize chat with AI greeting
    if (!hasInitializedRef.current) {
      setIsGreeting(true);
      hasInitializedRef.current = true;
      await initChat();
      setIsGreeting(false);
      // Don't start listening here - let the auto-listen effect handle it
      return;
    }

    // Start listening
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
