import axios from 'axios';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const search = async ({
  term,
  lat = 25.2855,
  lon = 51.5314,
  sort = 'price',
  page = 1,
  platforms = ['snoonu', 'rafeeq', 'talabat'],
  price_min,
  price_max,
  time_min,
  time_max,
  restaurant_filter = '',
  group_by_restaurant = false,
  region,
  language,
  generateAudio = false
}) => {
  try {
    const response = await api.post('/search', {
      term,
      lat,
      lon,
      sort,
      page,
      platforms,
      price_min,
      price_max,
      time_min,
      time_max,
      restaurant_filter,
      group_by_restaurant,
      ...(region && { region }),
      ...(language && { language }),
      ...(generateAudio && { generateAudio }),
    });
    return response.data;
  } catch (error) {
    console.error('Error searching:', error);
    throw error;
  }
};

export const processVoice = async ({
  text,
  lat = 25.2855,
  lon = 51.5314,
  validate = false
}) => {
  try {
    const response = await api.post('/process-voice', {
      text,
      lat,
      lon,
      validate
    });
    return response.data;
  } catch (error) {
    console.error('Error processing voice:', error);
    throw error;
  }
};

/**
 * Transcribe audio using AssemblyAI via the backend
 * @param {Blob} audioBlob - Audio blob from MediaRecorder
 * @returns {Promise<{transcript: string, success: boolean}>}
 */
export const transcribeAudio = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await api.post('/transcribe-assemblyai', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for transcription
    });
    return response.data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

/**
 * Start a new chat session with greeting
 * @param {string} sessionId - Optional session ID
 * @param {boolean} generateAudio - Whether to generate TTS audio
 * @returns {Promise<{greeting: string, sessionId: string, audio?: object}>}
 */
export const startChat = async (sessionId, generateAudio = false, language = 'en') => {
  try {
    const response = await api.post('/chat/start', {
      sessionId,
      generateAudio,
      language
    });
    return response.data;
  } catch (error) {
    console.error('Error starting chat:', error);
    throw error;
  }
};

/**
 * Send a chat message
 * @param {string} message - User message
 * @param {string} sessionId - Session ID
 * @param {boolean} generateAudio - Whether to generate TTS audio
 * @returns {Promise<{response: string, foodMentioned: boolean, foodItems: string[], shouldSearch: boolean, audio?: object}>}
 */
export const sendChatMessage = async (message, sessionId, generateAudio = false, language = 'en') => {
  try {
    const response = await api.post('/chat', {
      message,
      sessionId,
      generateAudio,
      language
    });
    return response.data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

/**
 * Send audio for voice-to-voice chat (UNLIMITED via Native Audio)
 * @param {string} audioBase64 - Base64 encoded audio data
 * @param {string} mimeType - Audio MIME type
 * @param {string} sessionId - Session ID
 * @returns {Promise<{response: string, transcript: string, foodMentioned: boolean, foodItems: string[], shouldSearch: boolean, audio?: object}>}
 */
export const sendAudioChat = async (audioBase64, mimeType, sessionId) => {
  try {
    const response = await api.post('/chat/audio', {
      audio: audioBase64,
      mimeType,
      sessionId
    }, {
      timeout: 60000 // 60 seconds for audio processing
    });
    return response.data;
  } catch (error) {
    console.error('Error sending audio chat:', error);
    throw error;
  }
};

export default api;
