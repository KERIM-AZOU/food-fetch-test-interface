import { useCallback, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import { search, startChat, sendChatMessage, sendAudioChat } from '../services/api';
import useAIVoice from './useAIVoice';

// If the LLM accidentally returns the JSON schema as a plain string,
// parse it and merge its fields so the app keeps working correctly.
const normalizeChat = (result) => {
  if (!result.response) return result;
  const str = result.response.trim();
  if (!str.startsWith('{')) return result;
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && 'response' in parsed) {
      return { ...result, ...parsed };
    }
  } catch {}
  return result;
};

const useChat = () => {
  const { speak, playAudioBase64 } = useAIVoice();
  const abortRef = useRef(null);
  const sessionIdRef = useRef(null);
  const lastFoodItemsRef = useRef([]);

  const {
    addMessage: addMessageToStore,
    setLastResults,
    setPagination,
    setAllRestaurants,
    setIsLoading,
    setSphereState,
    setLanguage: setStoreLanguage,
    setConversationActive,
    triggerAutoListen,
    getSearchParams,
    language,
  } = useChatStore();

  // Generate session ID on mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  }, []);

  // Cancel any pending request
  const cancelPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Add message - NEVER auto-speak (TTS handled separately)
  const addMessage = useCallback((message) => {
    addMessageToStore(message);
  }, [addMessageToStore]);

  // Start chat with greeting
  const initChat = useCallback(async () => {
    try {
      setSphereState('processing');
      const result = await startChat(sessionIdRef.current, true, language);

      if (result.sessionId) {
        sessionIdRef.current = result.sessionId;
      }

      // Show greeting message
      addMessage({ type: 'bot', content: result.greeting });

      // Mark conversation as active (enables auto-listen loop)
      setConversationActive(true);

      // Play audio (blocks until done)
      if (result.audio?.data) {
        await playAudioBase64(result.audio.data, result.audio.contentType || 'audio/wav');
      } else {
        await speak(result.greeting);
      }

      // Signal VoiceSphere to auto-listen
      triggerAutoListen();
      setSphereState('idle');
    } catch (error) {
      console.error('Failed to init chat:', error);
      const fallback = "Hey! What food do you want?";
      addMessage({ type: 'bot', content: fallback });
      await speak(fallback);
      triggerAutoListen();
      setSphereState('idle');
    }
  }, [addMessage, setSphereState, speak, playAudioBase64, setConversationActive, triggerAutoListen, language]);

  // Perform food search — returns summary + audio from backend when generateAudio=true
  const doFoodSearch = useCallback(async (foodItems, controller, language, generateAudio = false) => {
    const params = getSearchParams(); // includes region
    const searchTerm = foodItems[0]; // use first food item per API spec

    const result = await search({ term: searchTerm, ...params, language, generateAudio });
    if (controller?.signal.aborted) return;

    setLastResults(result.products || []);
    setPagination(result.pagination || null);
    setAllRestaurants(result.all_restaurants || []);

    const count = result.products?.length || 0;
    const total = result.pagination?.total_products || count;

    return { count, total, products: result.products, summary: result.summary, audio: result.audio };
  }, [getSearchParams, setLastResults, setPagination, setAllRestaurants]);

  // Text search (direct search, bypasses chat)
  const handleSearch = useCallback(async (term) => {
    cancelPending();

    addMessage({ type: 'user', content: term });
    setIsLoading(true);
    setSphereState('processing');

    await speak(`Searching for ${term}`);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = getSearchParams();
      const result = await search({ term, ...params, language });

      if (controller.signal.aborted) return;

      setLastResults(result.products || []);
      setPagination(result.pagination || null);
      setAllRestaurants(result.all_restaurants || []);

      const count = result.products?.length || 0;
      const total = result.pagination?.total_products || count;
      const resultMessage = count > 0
        ? `Found ${total} results for ${term}`
        : `No results for ${term}. Try something else.`;

      addMessage({
        type: 'bot',
        content: resultMessage,
        products: count > 0 ? result.products : undefined
      });
      await speak(resultMessage);

      setSphereState('idle');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Search error:', error);
      addMessage({ type: 'error', content: 'Search failed. Try again.' });
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [cancelPending, addMessage, setIsLoading, setSphereState, getSearchParams, setLastResults, setPagination, setAllRestaurants, speak, language]);

  // Voice/text input - conversational chat
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
      addMessage({ type: 'user', content: rawText });

      const chatResult = normalizeChat(await sendChatMessage(rawText, sessionIdRef.current, true, language));

      if (controller.signal.aborted) return;

      if (chatResult.sessionId) {
        sessionIdRef.current = chatResult.sessionId;
      }

      if (chatResult.foodMentioned && chatResult.foodItems?.length > 0) {
        lastFoodItemsRef.current = chatResult.foodItems;
      }

      // Stop conversation loop if user said stop/bye
      if (chatResult.shouldStop) {
        setConversationActive(false);
      }

      // Show and speak response — skip if empty (shouldSearch: true sends response: "")
      if (chatResult.response) {
        addMessage({ type: 'bot', content: chatResult.response });
      }
      if (!chatResult.shouldSearch) {
        if (chatResult.audio?.data) {
          await playAudioBase64(chatResult.audio.data, chatResult.audio.contentType || 'audio/wav');
        } else if (chatResult.response) {
          await speak(chatResult.response);
        }
      }

      // Search if needed — pass language + generateAudio to get spoken summary
      if (chatResult.shouldSearch && lastFoodItemsRef.current.length > 0) {
        setSphereState('processing');
        const searchLang = detectedLanguage || language;
        const searchResult = await doFoodSearch(lastFoodItemsRef.current, controller, searchLang, true);

        if (controller.signal.aborted) return;

        if (searchResult) {
          const { summary, audio, products } = searchResult;
          const displayMsg = summary || (products?.length > 0 ? `Found results!` : `Nothing found. Try something else?`);

          addMessage({
            type: 'bot',
            content: displayMsg,
            products: products?.length > 0 ? products : undefined
          });

          // Play search audio announcement
          if (audio?.data) {
            await playAudioBase64(audio.data, audio.contentType || 'audio/mpeg');
          } else if (summary) {
            await speak(summary);
          }
        }
      }

      if (detectedLanguage !== 'en') {
        setStoreLanguage(detectedLanguage);
      }

      // Signal auto-listen if conversation continues
      if (!chatResult.shouldStop) {
        triggerAutoListen();
      }
      setSphereState('idle');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Chat error:', error);
      addMessage({ type: 'error', content: 'Something went wrong. Try again.' });
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [cancelPending, addMessage, setIsLoading, setSphereState, setStoreLanguage, speak, playAudioBase64, doFoodSearch, setConversationActive, triggerAutoListen, language]);

  // Audio input - sends raw audio to chat API
  const handleAudioInput = useCallback(async (audioBase64, mimeType) => {
    if (!audioBase64) {
      setSphereState('idle');
      return;
    }

    cancelPending();
    setIsLoading(true);
    setSphereState('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Send audio to chat/audio endpoint
      const chatResult = normalizeChat(await sendAudioChat(audioBase64, mimeType, sessionIdRef.current, language));

      if (controller.signal.aborted) return;

      // Update session ID
      if (chatResult.sessionId) {
        sessionIdRef.current = chatResult.sessionId;
      }

      // Show user message
      if (chatResult.transcript) {
        addMessage({ type: 'user', content: chatResult.transcript });
      }

      // Store food items
      if (chatResult.foodMentioned && chatResult.foodItems?.length > 0) {
        lastFoodItemsRef.current = chatResult.foodItems;
      }

      // Stop conversation loop if user said stop/bye
      if (chatResult.shouldStop) {
        setConversationActive(false);
      }

      // Add bot response message — skip if empty (shouldSearch: true sends response: "")
      if (chatResult.response) {
        addMessage({ type: 'bot', content: chatResult.response });
      }

      // Play audio response — skip when shouldSearch (nothing to play, response is "")
      if (!chatResult.shouldSearch) {
        try {
          if (chatResult.audio?.data) {
            await playAudioBase64(chatResult.audio.data, chatResult.audio.contentType || 'audio/wav');
          } else if (chatResult.response) {
            await speak(chatResult.response);
          }
        } catch (ttsErr) {
          console.error('TTS playback error:', ttsErr);
        }
      }

      // If should search, do it — pass language + generateAudio to get spoken summary
      if (chatResult.shouldSearch && lastFoodItemsRef.current.length > 0) {
        try {
          setSphereState('processing');
          const searchLang = chatResult.language || language;
          const searchResult = await doFoodSearch(lastFoodItemsRef.current, controller, searchLang, true);

          if (controller.signal.aborted) return;

          if (searchResult) {
            const { summary, audio, products } = searchResult;
            const displayMsg = summary || (products?.length > 0 ? `Found results!` : `Nothing found. Try something else?`);

            addMessage({
              type: 'bot',
              content: displayMsg,
              products: products?.length > 0 ? products : undefined
            });

            // Play search audio announcement
            if (audio?.data) {
              await playAudioBase64(audio.data, audio.contentType || 'audio/mpeg');
            } else if (summary) {
              await speak(summary);
            }
          }
        } catch (searchErr) {
          console.error('Search error:', searchErr);
        }
      }

      // Signal auto-listen if conversation continues
      if (!chatResult.shouldStop) {
        triggerAutoListen();
      }
      setSphereState('idle');
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Audio chat error:', error);
      addMessage({ type: 'error', content: 'Something went wrong. Try again.' });
      setSphereState('error');
      setTimeout(() => setSphereState('idle'), 3000);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [cancelPending, addMessage, setIsLoading, setSphereState, speak, playAudioBase64, doFoodSearch, setConversationActive, triggerAutoListen, language]);

  return { handleSearch, handleVoiceInput, handleAudioInput, initChat };
};

export default useChat;
