import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  // Chat messages
  messages: [],

  // Voice sphere state: idle | listening | processing | speaking | error
  sphereState: 'idle',

  // Search context
  location: { lat: 25.2855, lon: 51.5314 },
  platforms: ['snoonu', 'rafeeq', 'talabat'],

  // Language setting (ISO code)
  language: 'en',

  // Filters
  filters: {
    sort: 'price',
    price_min: undefined,
    price_max: undefined,
    time_min: undefined,
    time_max: undefined,
    restaurant_filter: ''
  },

  // Results
  lastResults: [],
  pagination: null,
  allRestaurants: [],

  // Current page
  currentPage: 1,

  // Loading state
  isLoading: false,

  // TTS playback state (shared across all components)
  isSpeaking: false,

  // Conversation loop active (auto-listen enabled until user says stop)
  conversationActive: false,

  // Trigger for auto-listen after TTS finishes (incremented by useChat)
  pendingAutoListen: 0,

  // Actions
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...message
    }]
  })),

  clearMessages: () => set({ messages: [] }),

  setSphereState: (sphereState) => set({ sphereState }),

  setLocation: (location) => set({ location }),

  setLanguage: (language) => set({ language }),

  setPlatforms: (platforms) => set({ platforms }),

  togglePlatform: (platform) => set((state) => {
    const platforms = state.platforms.includes(platform)
      ? state.platforms.filter(p => p !== platform)
      : [...state.platforms, platform];
    return { platforms: platforms.length > 0 ? platforms : state.platforms };
  }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  resetFilters: () => set({
    filters: {
      sort: 'price',
      price_min: undefined,
      price_max: undefined,
      time_min: undefined,
      time_max: undefined,
      restaurant_filter: ''
    }
  }),

  setLastResults: (results) => set({ lastResults: results }),

  setPagination: (pagination) => set({ pagination }),

  setAllRestaurants: (restaurants) => set({ allRestaurants: restaurants }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),

  setConversationActive: (conversationActive) => set({ conversationActive }),

  triggerAutoListen: () => set((state) => ({ pendingAutoListen: state.pendingAutoListen + 1 })),

  // Get current search params
  getSearchParams: () => {
    const state = get();
    return {
      lat: state.location.lat,
      lon: state.location.lon,
      platforms: state.platforms,
      page: state.currentPage,
      ...state.filters
    };
  }
}));

export default useChatStore;
