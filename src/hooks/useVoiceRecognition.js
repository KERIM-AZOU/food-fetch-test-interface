import { useState, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

// Audio settings
const NOISE_THRESHOLD = 0.08; // Ignore sounds below this level (0-1)
const SILENCE_DURATION = 1500; // Auto-stop after 1.5 seconds of silence
const MIN_SPEECH_TIME = 400; // User must speak for at least 400ms before silence detection activates

const useVoiceRecognition = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState({ interim: '', final: '', language: 'en' });
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const useBackendRef = useRef(false);
  const isRecordingRef = useRef(false);

  // Silence detection refs
  const silenceStartRef = useRef(null);
  const speechStartRef = useRef(null); // When user started speaking
  const hasSpeechRef = useRef(false); // True after user has spoken long enough
  const speakingStartRef = useRef(null); // Tracks continuous speaking duration

  const stopAll = useCallback(() => {
    isRecordingRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    silenceStartRef.current = null;
    speechStartRef.current = null;
    speakingStartRef.current = null;
    hasSpeechRef.current = false;
    setVolume(0);
  }, []);

  const startVolumeAnimation = useCallback((stream, onSilenceDetected) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Reset silence detection state
      silenceStartRef.current = null;
      speechStartRef.current = null;
      speakingStartRef.current = null;
      hasSpeechRef.current = false;

      const animate = () => {
        if (!analyserRef.current || !isRecordingRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedVolume = Math.min(1, avg / 128);

        // Noise gate: only show volume if above threshold
        const filteredVolume = normalizedVolume > NOISE_THRESHOLD ? normalizedVolume : 0;
        setVolume(filteredVolume);

        const now = Date.now();

        if (filteredVolume > NOISE_THRESHOLD) {
          // User is making sound above threshold
          silenceStartRef.current = null;

          // Track when continuous speaking started
          if (!speakingStartRef.current) {
            speakingStartRef.current = now;
          }

          // Only mark as "has speech" after speaking for MIN_SPEECH_TIME
          // This ensures brief noises don't trigger silence detection
          if (!hasSpeechRef.current && (now - speakingStartRef.current) >= MIN_SPEECH_TIME) {
            hasSpeechRef.current = true;
            speechStartRef.current = now;
            console.log('Speech detected - silence monitoring activated');
          }
        } else {
          // Silence - reset speaking start time
          speakingStartRef.current = null;

          // Only check for auto-stop if user has already spoken
          if (hasSpeechRef.current) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current > SILENCE_DURATION) {
              // Silence duration exceeded - auto stop
              console.log('Auto-stopping: silence detected after speech');
              if (onSilenceDetected) {
                onSilenceDetected();
              }
              return; // Stop animation loop
            }
          }
        }

        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (e) {
      console.warn('Volume animation failed:', e);
    }
  }, []);

  // Send audio to backend for transcription
  const transcribeWithBackend = useCallback(async (audioBlob) => {
    try {
      setStatus('processing');

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('Sending audio to backend for transcription...');

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Transcription failed');
      }

      const result = await response.json();
      const text = result.text?.trim();
      const detectedLanguage = result.language || 'en';

      console.log('Backend transcription:', text, '| Language:', detectedLanguage);

      if (text) {
        setTranscript({ interim: '', final: text, language: detectedLanguage });
        setStatus('idle');
      } else {
        setError('No speech detected. Tap to try again.');
        setStatus('error');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Transcription failed. Try again.');
      setStatus('error');
    }
  }, []);

  // Start recording with MediaRecorder (for backend transcription)
  const startBackendRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      isRecordingRef.current = true;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeWithBackend(audioBlob);
        } else {
          setStatus('idle');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Start volume animation with silence detection callback
      startVolumeAnimation(stream, () => {
        // Auto-stop when silence is detected
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          isRecordingRef.current = false;
          setStatus('processing');
        }
      });

      setStatus('listening');
      console.log('Recording started (backend mode)');
    } catch (err) {
      console.error('Mic error:', err);
      setError('Microphone access denied.');
      setStatus('error');
    }
  }, [startVolumeAnimation, transcribeWithBackend]);

  // Main start function
  const start = useCallback(async () => {
    setTranscript({ interim: '', final: '' });
    setError(null);

    // If already using backend mode, use it directly
    if (useBackendRef.current) {
      await startBackendRecording();
      return;
    }

    // Try Web Speech API first
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('Web Speech API not supported, switching to backend');
      useBackendRef.current = true;
      await startBackendRecording();
      return;
    }

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      isRecordingRef.current = true;
      // Web Speech API handles its own silence detection, so no callback needed
      startVolumeAnimation(stream, null);
    } catch (err) {
      console.error('Mic permission denied:', err);
      setError('Microphone access denied.');
      setStatus('error');
      return;
    }

    // Setup speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      setTranscript({ interim, final });
      if (final) setStatus('processing');
    };

    recognition.onerror = async (event) => {
      console.error('Speech API error:', event.error);
      stopAll();

      // Switch to backend on network/service errors
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        console.log('Switching to backend transcription...');
        useBackendRef.current = true;
        setError(null);
        await startBackendRecording();
        return;
      }

      const msgs = {
        'not-allowed': 'Microphone blocked.',
        'no-speech': 'No speech detected. Tap to try again.',
        'audio-capture': 'No microphone found.',
        'aborted': 'Cancelled.',
      };
      setError(msgs[event.error] || `Error: ${event.error}`);
      setStatus('error');
    };

    recognition.onend = () => {
      stopAll();
      setStatus(prev => prev === 'processing' ? prev : 'idle');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start:', e);
      stopAll();
      setError('Failed to start.');
      setStatus('error');
    }
  }, [startBackendRecording, startVolumeAnimation, stopAll]);

  const stop = useCallback(() => {
    // If using backend mode, stop the MediaRecorder
    if (useBackendRef.current && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
      setStatus('processing');
      return;
    }

    // Otherwise stop speech recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    stopAll();
    setStatus('idle');
  }, [stopAll]);

  return { status, error, transcript, volume, start, stop };
};

export default useVoiceRecognition;
