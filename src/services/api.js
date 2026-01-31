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
  group_by_restaurant = false
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
      group_by_restaurant
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

export default api;
