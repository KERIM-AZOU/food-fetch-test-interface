import { useState, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

// Audio settings
const SILENCE_DURATION = 1500; // Auto-stop after 1.5s of silence
const NOISE_THRESHOLD = 0.08;
const MIN_SPEECH_TIME = 400;

// Get supported audio MIME type (critical for cross-platform support)
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // Let browser pick default
};

const useVoiceRecognition = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState({ interim: '', final: '', language: 'en' });
  const [volume, setVolume] = useState(0);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const silenceRef = useRef({ start: null, hasSpeech: false, speakingStart: null });

  // Cleanup all resources
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silenceRef.current = { start: null, hasSpeech: false, speakingStart: null };
    setVolume(0);
  }, []);

  // Send audio to backend for transcription
  const transcribe = useCallback(async (audioBlob) => {
    setStatus('processing');
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ''));

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: audioBlob.type }),
      });

      if (!response.ok) throw new Error('Transcription failed');

      const { text, language } = await response.json();
      if (text?.trim()) {
        setTranscript({ interim: '', final: text.trim(), language: language || 'en' });
        setStatus('idle');
      } else {
        setError('No speech detected');
        setStatus('error');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Transcription failed');
      setStatus('error');
    }
  }, []);

  // Volume monitoring with silence detection
  const startVolumeMonitor = useCallback((stream, onSilence) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      audioContextRef.current.createMediaStreamSource(stream).connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      silenceRef.current = { start: null, hasSpeech: false, speakingStart: null };

      const monitor = () => {
        if (!analyserRef.current) return;

        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const vol = Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 128);
        const filtered = vol > NOISE_THRESHOLD ? vol : 0;
        setVolume(filtered);

        const now = Date.now();
        const s = silenceRef.current;

        if (filtered > NOISE_THRESHOLD) {
          s.start = null;
          if (!s.speakingStart) s.speakingStart = now;
          if (!s.hasSpeech && now - s.speakingStart >= MIN_SPEECH_TIME) {
            s.hasSpeech = true;
          }
        } else {
          s.speakingStart = null;
          if (s.hasSpeech) {
            if (!s.start) s.start = now;
            else if (now - s.start > SILENCE_DURATION) {
              onSilence?.();
              return;
            }
          }
        }
        animationRef.current = requestAnimationFrame(monitor);
      };
      monitor();
    } catch (e) {
      console.warn('Volume monitor failed:', e);
    }
  }, []);

  // Start recording
  const start = useCallback(async () => {
    cleanup();
    setTranscript({ interim: '', final: '', language: 'en' });
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // On mobile, always use backend transcription (more reliable)
      // On desktop, also use backend for consistency
      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType || 'default');

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanup();
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          await transcribe(blob);
        } else {
          setStatus('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('listening');

      // Start volume monitor with auto-stop on silence
      startVolumeMonitor(stream, () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      });

      // Safety timeout (30s max)
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 30000);

    } catch (err) {
      console.error('Mic error:', err);
      setError('Microphone access denied');
      setStatus('error');
    }
  }, [cleanup, transcribe, startVolumeMonitor]);

  // Stop recording
  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
    } else {
      cleanup();
      setStatus('idle');
    }
  }, [cleanup]);

  return { status, error, transcript, volume, start, stop };
};

export default useVoiceRecognition;
