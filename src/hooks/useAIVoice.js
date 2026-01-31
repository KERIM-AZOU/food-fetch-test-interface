import { useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

/**
 * Hook for AI-powered text-to-speech using ElevenLabs
 * Falls back to browser TTS if ElevenLabs is not configured
 */
const useAIVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  const useElevenLabsRef = useRef(true); // Try ElevenLabs first

  // Stop any currently playing audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
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

      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TTS failed');
      }

      const { audio, contentType } = await response.json();

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: contentType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the audio
      return new Promise((resolve) => {
        const audioElement = new Audio(audioUrl);
        audioRef.current = audioElement;

        audioElement.onplay = () => {
          setIsLoading(false);
          setIsSpeaking(true);
        };

        audioElement.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          resolve();
        };

        audioElement.onerror = () => {
          setIsSpeaking(false);
          setIsLoading(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          resolve();
        };

        audioElement.play().catch(() => {
          setIsLoading(false);
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

  return {
    speak,
    stop,
    isSpeaking,
    isLoading, // True while fetching AI audio
  };
};

export default useAIVoice;
