import { useCallback, useRef } from 'react';
import useChatStore from '../store/chatStore';
import { search } from '../services/api';
import useAIVoice from './useAIVoice';

const API_URL = import.meta.env.VITE_FETCH_API_URL || 'http://localhost:3000';

const useChat = () => {
  const { speak } = useAIVoice();
  const abortRef = useRef(null);

  const {
    addMessage: addMessageToStore,
    setLastResults,
    setPagination,
    setAllRestaurants,
    setIsLoading,
    setSphereState,
    setLanguage: setStoreLanguage,
    getSearchParams,
  } = useChatStore();

  // Cancel any pending request
  const cancelPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Add message with optional TTS
  const addMessage = useCallback((message, shouldSpeak = true) => {
    addMessageToStore(message);
    if (shouldSpeak && (message.type === 'bot' || message.type === 'error')) {
      speak(message.content.replace(/\*\*/g, ''));
    }
  }, [addMessageToStore, speak]);

  // Text search
  const handleSearch = useCallback(async (term) => {
    cancelPending();

    addMessage({ type: 'user', content: term }, false);
    setIsLoading(true);
    setSphereState('processing');

    // Announce searching
    await speak(`Searching for ${term}`);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = getSearchParams();
      const result = await search({ term, ...params });

      if (controller.signal.aborted) return;

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);

      const count = result.products?.length || 0;
      const total = result.pagination?.total_products || count;
      const resultMessage = count > 0
        ? `Found ${total} results for ${term}`
        : `No results found for ${term}. Try a different search term.`;

      // Speak and add message
      await speak(resultMessage);
      addMessage({
        type: 'bot',
        content: resultMessage,
        products: count > 0 ? result.products : undefined
      }, false);

      setSphereState('idle');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Search error:', error);
      addMessage({ type: 'error', content: 'Sorry, I had trouble searching. Please try again.' });
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [cancelPending, addMessage, setIsLoading, setSphereState, getSearchParams, setLastResults, setPagination, setAllRestaurants, speak]);

  // Voice input
  const handleVoiceInput = useCallback(async (voiceText, detectedLanguage = 'en') => {
    const rawText = voiceText.trim();
    if (!rawText) {
      setSphereState('idle');
      return;
    }

    cancelPending();
    setIsLoading(true);
    setSphereState('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = getSearchParams();

      // Extract keywords
      const processRes = await fetch(`${API_URL}/process-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          language: detectedLanguage,
          lat: params.lat,
          lon: params.lon
        }),
        signal: controller.signal
      });

      if (controller.signal.aborted) return;

      const processResult = await processRes.json();

      // Handle non-food requests
      if (processResult.not_food_related) {
        await speak(processResult.search_message);
        addMessage({ type: 'bot', content: processResult.search_message }, false);
        setSphereState('idle');
        setIsLoading(false);
        return;
      }

      const searchQuery = processResult.search_query || rawText;
      const searchMessage = processResult.search_message || `Searching for ${searchQuery}`;

      // Announce search
      await speak(searchMessage);
      if (controller.signal.aborted) return;

      addMessage({ type: 'user', content: searchQuery }, false);

      // Search
      const result = await search({ term: searchQuery, ...params });
      if (controller.signal.aborted) return;

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);

      // Update language if detected
      if (detectedLanguage !== 'en') {
        setStoreLanguage(detectedLanguage);
      }

      const count = result.products?.length || 0;
      const total = result.pagination?.total_products || count;

      // Result message with search term
      const resultMessage = count > 0
        ? `Found ${total} results for ${searchQuery}`
        : `No results found for ${searchQuery}. Try something else!`;

      // Speak and add message
      await speak(resultMessage);
      addMessage({
        type: 'bot',
        content: resultMessage,
        products: count > 0 ? result.products : undefined
      }, false);

      setSphereState('idle');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Voice input error:', error);
      addMessage({ type: 'error', content: 'Sorry, something went wrong. Please try again.' });
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [cancelPending, addMessage, setIsLoading, setSphereState, getSearchParams, setLastResults, setPagination, setAllRestaurants, speak, setStoreLanguage]);

  return { handleSearch, handleVoiceInput };
};

export default useChat;
