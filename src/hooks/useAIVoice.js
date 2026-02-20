import { useState, useCallback, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';

const API_URL = import.meta.env.VITE_FETCH_TST_API_URL || 'http://localhost:3000';

// Safety timeout — if audio never fires 'ended', auto-resolve after this
const PLAY_TIMEOUT_MS = 15000;

/**
 * Hook for AI-powered text-to-speech using ElevenLabs
 * Falls back to browser TTS if ElevenLabs is not configured
 *
 * iOS Safari fix: reuses a single Audio element unlocked on first user gesture.
 */
const useAIVoice = () => {
  const isSpeaking = useChatStore(state => state.isSpeaking);
  const setIsSpeaking = useChatStore(state => state.setIsSpeaking);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  const unlockedRef = useRef(false);
  const useElevenLabsRef = useRef(true);

  // Create a persistent audio element once (iOS needs this reused)
  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      audioRef.current = el;
    }
  }, []);

  // Unlock audio on first user gesture (iOS requirement)
  // Uses load() instead of play()/pause() to avoid race conditions
  useEffect(() => {
    const unlock = () => {
      const el = audioRef.current;
      if (el && !unlockedRef.current) {
        el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        el.load();
        unlockedRef.current = true;
      }
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Core play function — reuses persistent element, with timeout safety
  const playOnElement = useCallback((audioUrl) => {
    return new Promise((resolve) => {
      const el = audioRef.current;
      if (!el) { resolve(); return; }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setIsSpeaking(false);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        resolve();
      };

      const onEnded = () => {
        URL.revokeObjectURL(audioUrl);
        settle();
      };

      const onError = () => {
        URL.revokeObjectURL(audioUrl);
        settle();
      };

      // Safety timeout — never hang forever
      const timer = setTimeout(() => {
        console.warn('Audio play timed out, resolving');
        try { el.pause(); } catch (e) {}
        URL.revokeObjectURL(audioUrl);
        settle();
      }, PLAY_TIMEOUT_MS);

      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      // Setting src on an already-loaded element works on iOS
      el.src = audioUrl;
      el.play().then(() => {
        setIsSpeaking(true);
      }).catch((err) => {
        console.warn('Audio play() rejected:', err.message);
        URL.revokeObjectURL(audioUrl);
        settle();
      });
    });
  }, [setIsSpeaking]);

  // Stop any currently playing audio
  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
      // Re-load silent src so the element stays "warm" for iOS
      el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      el.load();
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [setIsSpeaking]);

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
  }, [setIsSpeaking]);

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

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: contentType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      setIsLoading(false);
      return playOnElement(audioUrl);
    } catch (error) {
      console.warn('ElevenLabs TTS failed, falling back to browser:', error.message);
      setIsLoading(false);
      useElevenLabsRef.current = false;
      return speakWithBrowser(text);
    }
  }, [speakWithBrowser, playOnElement]);

  // Main speak function - tries AI first, falls back to browser
  const speak = useCallback(async (text) => {
    if (!text) return;

    stop();

    if (useElevenLabsRef.current) {
      return speakWithAI(text);
    } else {
      return speakWithBrowser(text);
    }
  }, [stop, speakWithAI, speakWithBrowser]);

  // Play audio directly from base64 data (reuses persistent element for iOS)
  const playAudioBase64 = useCallback(async (base64Data, contentType = 'audio/wav') => {
    if (!base64Data) return;

    // Don't call stop() here — just set new src (avoids killing iOS unlock state)
    const el = audioRef.current;
    if (el && !el.paused) {
      el.pause();
    }
    setIsSpeaking(false);

    try {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))],
        { type: contentType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      return playOnElement(audioUrl);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [playOnElement, setIsSpeaking]);

  return {
    speak,
    stop,
    playAudioBase64,
    isSpeaking,
    isLoading,
  };
};

export default useAIVoice;
