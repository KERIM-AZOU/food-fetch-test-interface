import { useState, useEffect, useCallback } from 'react';

const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [synth, setSynth] = useState(null);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS: speechSynthesis API not supported');
      return;
    }
    const speechSynthesis = window.speechSynthesis;
    setSynth(speechSynthesis);

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      if (availableVoices.length > 0) {
        // Test if TTS actually works with a silent utterance
        const test = new SpeechSynthesisUtterance('');
        test.volume = 0;
        test.onend = () => {
          console.log('TTS: Engine is available.');
          setIsAvailable(true);
        };
        test.onerror = (e) => {
          console.warn('TTS: engine not working (' + e.error + ').');
          setIsAvailable(false);
        };
        speechSynthesis.speak(test);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Find the best voice for a given language code
  const getVoiceForLanguage = useCallback((langCode) => {
    if (voices.length === 0) return null;

    // Try to find a voice that matches the language code
    const matchingVoices = voices.filter(v => v.lang.startsWith(langCode));

    if (matchingVoices.length > 0) {
      // Prefer voices with the exact match or common variants
      return matchingVoices.find(v => v.lang === `${langCode}-${langCode.toUpperCase()}`)
        || matchingVoices[0];
    }

    // Fallback to English if no matching voice
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    return englishVoices.find(v => v.lang === 'en-US')
      || englishVoices[0]
      || voices[0];
  }, [voices]);

  const speak = useCallback((text, langCode = 'en') => {
    return new Promise((resolve, reject) => {
      if (!synth || !text || !isAvailable) {
        resolve();
        return;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getVoiceForLanguage(langCode);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = langCode;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          console.error('Speech synthesis error:', event.error);
        }
        setIsSpeaking(false);
        reject(event.error);
      };

      // A short delay can help prevent issues on some browsers
      setTimeout(() => synth.speak(utterance), 100);
    });
  }, [synth, isAvailable, getVoiceForLanguage]);

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);

  return {
    isSpeaking,
    isAvailable,
    speak,
    stop,
  };
};

export default useTTS;

