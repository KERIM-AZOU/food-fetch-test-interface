import { useCallback } from 'react';
import useChatStore from '../store/chatStore';
import { search } from '../services/api';
import useAIVoice from './useAIVoice';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

// Translate text using backend
async function translateText(text, language) {
  if (language === 'en') return text;

  try {
    const response = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    const result = await response.json();
    return result.translated || text;
  } catch {
    return text;
  }
}

const useChat = () => {
  const { speak } = useAIVoice();
  const {
    messages,
    language: storeLanguage,
    setLanguage: setStoreLanguage,
    addMessage: addMessageToStore,
    setLastResults,
    setPagination,
    setAllRestaurants,
    setIsLoading,
    setSphereState,
    getSearchParams,
  } = useChatStore();

  // Wrapper for addMessage to also speak bot messages
  const addMessage = useCallback((message, shouldSpeak = true) => {
    addMessageToStore(message);
    if (shouldSpeak && (message.type === 'bot' || message.type === 'error')) {
      const textToSpeak = message.content.replace(/\*\*/g, '');
      speak(textToSpeak);
    }
  }, [addMessageToStore, speak]);

  const handleSearch = useCallback(async (term) => {
    addMessage({ type: 'user', content: term });
    setIsLoading(true);
    setSphereState('processing');

    try {
      const params = getSearchParams();
      const result = await search({ term, ...params });

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);

      const productCount = result.products?.length || 0;
      if (productCount > 0) {
        addMessage({
          type: 'bot',
          content: `Found ${result.pagination?.total_products || productCount} results for "${term}"`,
          products: result.products
        });
      } else {
        addMessage({
          type: 'bot',
          content: `No results found for "${term}". Try a different search term.`
        });
      }

      setSphereState('idle');
    } catch (error) {
      addMessage({
        type: 'error',
        content: 'Sorry, I had trouble searching. Please try again.'
      });
      setSphereState('error');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading, setSphereState, getSearchParams, setLastResults, setPagination, setAllRestaurants]);

  const handleVoiceInput = useCallback(async (voiceText, detectedLanguage = 'en') => {
    const rawText = voiceText.trim();
    if (!rawText) return;

    setIsLoading(true);
    setSphereState('processing');

    try {
      // Extract keywords using the backend (pass detected language)
      const params = getSearchParams();
      const processResponse = await fetch(`${API_URL}/api/process-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          language: detectedLanguage, // Pass the detected language
          lat: params.lat,
          lon: params.lon,
          validate: false
        }),
      });

      const processResult = await processResponse.json();
      const searchQuery = processResult.search_query || rawText;
      const searchMessage = processResult.search_message || `Searching for ${searchQuery}`;

      console.log('Extracted keywords:', searchQuery, '| Language:', detectedLanguage);

      // Announce what we're searching for (in user's language)
      await speak(searchMessage);

      // Add user message with extracted query (don't speak it)
      addMessage({ type: 'user', content: searchQuery }, false);

      // Search with extracted keywords
      const result = await search({ term: searchQuery, ...params });

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);

      const productCount = result.products?.length || 0;

      // Store the detected language for future use
      if (detectedLanguage !== 'en') {
        setStoreLanguage(detectedLanguage);
      }

      // Generate result message in user's language
      if (productCount > 0) {
        const totalResults = result.pagination?.total_products || productCount;
        const resultMessage = await translateText(
          `Found ${totalResults} results for ${searchQuery}`,
          detectedLanguage
        );
        addMessage({
          type: 'bot',
          content: resultMessage,
          products: result.products
        });
      } else {
        const noResultMessage = await translateText(
          `No results found for ${searchQuery}. Try something else!`,
          detectedLanguage
        );
        addMessage({
          type: 'bot',
          content: noResultMessage
        });
      }

      setSphereState('idle');
    } catch (error) {
      console.error('Voice input error:', error);
      addMessage({
        type: 'error',
        content: 'Sorry, I had trouble processing that. Please try again.'
      });
      setSphereState('error');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading, setSphereState, getSearchParams, setLastResults, setPagination, setAllRestaurants, speak]);

  return {
    messages,
    handleSearch,
    handleVoiceInput
  };
};

export default useChat;
