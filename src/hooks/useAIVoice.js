import { useState, useCallback, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

/**
 * Hook for AI-powered text-to-speech using ElevenLabs
 * Falls back to browser TTS if ElevenLabs is not configured
 *
 * iOS Safari fix: reuses a single Audio element created on first user gesture
 * to avoid autoplay restrictions blocking subsequent plays.
 */
const useAIVoice = () => {
  const isSpeaking = useChatStore(state => state.isSpeaking);
  const setIsSpeaking = useChatStore(state => state.setIsSpeaking);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  const useElevenLabsRef = useRef(true);

  // Create a persistent audio element once (iOS needs this reused)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.playsInline = true;
    }
  }, []);

  // Unlock audio on first user gesture (iOS requirement)
  useEffect(() => {
    const unlock = () => {
      const el = audioRef.current;
      if (el) {
        // Play a silent snippet to unlock the element for future programmatic plays
        el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        el.play().then(() => {
          el.pause();
          el.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Stop any currently playing audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  // Speak using browser TTS (fallback)
  const speakWithBrowser = useCallback((text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // Speak using ElevenLabs API
  const speakWithAI = useCallback(async (text) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TTS failed');
      }

      const { audio, contentType } = await response.json();

      // Create audio from base64 and play via persistent element (iOS fix)
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: contentType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      return new Promise((resolve) => {
        const el = audioRef.current;
        if (!el) { setIsLoading(false); resolve(); return; }

        const onEnded = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          setIsSpeaking(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        };

        el.addEventListener('ended', onEnded);
        el.addEventListener('error', onError);

        el.src = audioUrl;
        el.play().then(() => {
          setIsLoading(false);
          setIsSpeaking(true);
        }).catch(() => {
          setIsLoading(false);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        });
      });
    } catch (error) {
      console.warn('ElevenLabs TTS failed, falling back to browser:', error.message);
      setIsLoading(false);
      useElevenLabsRef.current = false; // Don't try ElevenLabs again this session
      return speakWithBrowser(text);
    }
  }, [speakWithBrowser]);

  // Main speak function - tries AI first, falls back to browser
  const speak = useCallback(async (text) => {
    if (!text) return;

    stop(); // Stop any current speech

    if (useElevenLabsRef.current) {
      return speakWithAI(text);
    } else {
      return speakWithBrowser(text);
    }
  }, [stop, speakWithAI, speakWithBrowser]);

  // Play audio directly from base64 data (reuses persistent element for iOS)
  const playAudioBase64 = useCallback(async (base64Data, contentType = 'audio/wav') => {
    if (!base64Data) return;

    stop(); // Stop any current speech

    return new Promise((resolve) => {
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))],
          { type: contentType }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        let prevUrl = null;

        const el = audioRef.current;
        if (!el) { resolve(); return; }

        // Clean up previous object URL if any
        if (el.src && el.src.startsWith('blob:')) {
          prevUrl = el.src;
        }

        const onEnded = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        };

        el.addEventListener('ended', onEnded);
        el.addEventListener('error', onError);

        el.src = audioUrl;
        el.play().then(() => {
          setIsSpeaking(true);
        }).catch((err) => {
          console.error('iOS audio play failed:', err);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
          resolve();
        });
      } catch (error) {
        console.error('Failed to play audio:', error);
        resolve();
      }
    });
  }, [stop]);

  return {
    speak,
    stop,
    playAudioBase64,
    isSpeaking,
    isLoading, // True while fetching AI audio
  };
};

export default useAIVoice;
