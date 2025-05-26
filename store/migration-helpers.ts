// ABOUTME: Fixed migration helpers that properly memoize to avoid infinite loops
// ABOUTME: Provides compatibility layers and migration utilities

import { useUnifiedAudioStore, PlayerMode as UnifiedPlayerMode } from './useUnifiedAudioStore';
import type { ContentType, TtsProvider, Voice, AudioSettings } from './useUnifiedAudioStore';

// Warning shown flag to avoid console spam
let deprecationWarningShown = false;

/**
 * Migration helper for useAudioStore
 * This creates a proper Zustand store interface for backward compatibility
 */
const createAudioStoreHook = () => {
  // Create a function that mimics the old store behavior
  const useStore = () => {
    if (!deprecationWarningShown) {
      console.warn('useAudioStore is deprecated. Please migrate to useUnifiedAudioStore');
      deprecationWarningShown = true;
    }
    
    // Use individual selectors to avoid creating new objects
    const isInitialized = useUnifiedAudioStore(state => state.isInitialized);
    const isPlaying = useUnifiedAudioStore(state => state.isPlaying);
    const isPaused = useUnifiedAudioStore(state => state.isPaused);
    const isLoading = useUnifiedAudioStore(state => state.isLoading);
    const currentTime = useUnifiedAudioStore(state => state.currentTime);
    const duration = useUnifiedAudioStore(state => state.duration);
    const progress = useUnifiedAudioStore(state => state.progress);
    const volume = useUnifiedAudioStore(state => state.settings.volume);
    const playbackRate = useUnifiedAudioStore(state => state.settings.playbackRate);
    const contentType = useUnifiedAudioStore(state => state.contentType);
    const currentContent = useUnifiedAudioStore(state => state.currentContent);
    const playerMode = useUnifiedAudioStore(state => state.playerMode);
    const isVisible = useUnifiedAudioStore(state => state.isVisible);
    const positionMemory = useUnifiedAudioStore(state => state.positionMemory);
    const error = useUnifiedAudioStore(state => state.error);
    
    // Get functions (these are stable references)
    const initialize = useUnifiedAudioStore(state => state.initialize);
    const cleanup = useUnifiedAudioStore(state => state.cleanup);
    const loadContent = useUnifiedAudioStore(state => state.loadContent);
    const play = useUnifiedAudioStore(state => state.play);
    const pause = useUnifiedAudioStore(state => state.pause);
    const resume = useUnifiedAudioStore(state => state.resume);
    const stop = useUnifiedAudioStore(state => state.stop);
    const seek = useUnifiedAudioStore(state => state.seek);
    const setPlaybackRate = useUnifiedAudioStore(state => state.setPlaybackRate);
    const setVolume = useUnifiedAudioStore(state => state.setVolume);
    const updateSettings = useUnifiedAudioStore(state => state.updateSettings);
    const setPlayerMode = useUnifiedAudioStore(state => state.setPlayerMode);
    const togglePlayerMode = useUnifiedAudioStore(state => state.togglePlayerMode);
    const clearError = useUnifiedAudioStore(state => state.clearError);
    const getFormattedTime = useUnifiedAudioStore(state => state.getFormattedTime);
    const getContentProgress = useUnifiedAudioStore(state => state.getContentProgress);
    
    // Get settings individually to avoid creating new objects
    const settingsVolume = useUnifiedAudioStore(state => state.settings.volume);
    const settingsPlaybackRate = useUnifiedAudioStore(state => state.settings.playbackRate);
    const settingsAutoplay = useUnifiedAudioStore(state => state.settings.autoplay);
    const settingsRememberPosition = useUnifiedAudioStore(state => state.settings.rememberPosition);
    const settingsTtsVoiceId = useUnifiedAudioStore(state => state.settings.tts.voice?.id);
    
    const settings = {
      volume: settingsVolume,
      playbackRate: settingsPlaybackRate,
      autoplay: settingsAutoplay,
      rememberPosition: settingsRememberPosition,
      ttsVoiceId: settingsTtsVoiceId
    };
    
    return {
      // State mappings
      isInitialized,
      isPlaying,
      isPaused,
      isLoading,
      currentTime,
      duration,
      progress,
      volume,
      playbackRate,
      contentType,
      currentContent,
      playerMode,
      isVisible,
      settings,
      audioSource: null, // No longer exposed
      positionMemory,
      error,
      
      // Action mappings
      initialize,
      cleanup,
      loadAudioContent: loadContent,
      playTTS: async (text: string, metadata: any) => {
        await loadContent({
          id: metadata.id || `tts-${Date.now()}`,
          title: metadata.title || 'Text to Speech',
          source: metadata.source || 'Article',
          thumbnail: metadata.thumbnail,
          textContent: text,
          autoplay: true
        });
      },
      playAudio: async (url: string, metadata: any) => {
        await loadContent({
          id: metadata.id || `audio-${Date.now()}`,
          title: metadata.title || 'Audio',
          source: metadata.source || 'Podcast',
          thumbnail: metadata.thumbnail,
          audioUrl: url,
          autoplay: true
        });
      },
      play,
      pause,
      resume,
      stop,
      seek,
      setPlaybackRate,
      setVolume,
      updateSettings: (settings: any) => {
        const mappedSettings: Partial<AudioSettings> = {
          volume: settings.volume,
          playbackRate: settings.playbackRate,
          autoplay: settings.autoplay,
          rememberPosition: settings.rememberPosition
        };
        updateSettings(mappedSettings);
      },
      setPlayerMode,
      setVisibility: (visible: boolean) => {
        if (!visible) {
          setPlayerMode(UnifiedPlayerMode.DISABLED);
        }
      },
      togglePlayerMode,
      clearError,
      getFormattedTime,
      getContentProgress
    };
  };
  
  // Add store methods
  useStore.getState = () => useUnifiedAudioStore.getState();
  useStore.setState = (partial: any) => useUnifiedAudioStore.setState(partial);
  useStore.subscribe = (listener: any) => useUnifiedAudioStore.subscribe(listener);
  
  return useStore;
};

// Create the store hooks once
export const useAudioStore = createAudioStoreHook();

/**
 * Migration helper for useTtsStore
 */
const createTtsStoreHook = () => {
  const useStore = () => {
    // Use individual selectors
    const isInitialized = useUnifiedAudioStore(state => state.isInitialized);
    const contentType = useUnifiedAudioStore(state => state.contentType);
    const isPlaying = useUnifiedAudioStore(state => state.isPlaying && state.contentType === 'article');
    const isPaused = useUnifiedAudioStore(state => state.isPaused && state.contentType === 'article');
    const progress = useUnifiedAudioStore(state => state.contentType === 'article' ? state.progress : 0);
    const duration = useUnifiedAudioStore(state => state.contentType === 'article' ? state.duration : 0);
    const currentPosition = useUnifiedAudioStore(state => state.contentType === 'article' ? state.currentTime : 0);
    const playbackRate = useUnifiedAudioStore(state => state.settings.playbackRate);
    const currentContent = useUnifiedAudioStore(state => state.currentContent);
    const playerMode = useUnifiedAudioStore(state => state.playerMode);
    const isVisible = useUnifiedAudioStore(state => state.isVisible);
    const availableVoices = useUnifiedAudioStore(state => state.tts.availableVoices);
    const error = useUnifiedAudioStore(state => state.error);
    
    // Get functions
    const initialize = useUnifiedAudioStore(state => state.initialize);
    const cleanup = useUnifiedAudioStore(state => state.cleanup);
    const loadContent = useUnifiedAudioStore(state => state.loadContent);
    const pause = useUnifiedAudioStore(state => state.pause);
    const resume = useUnifiedAudioStore(state => state.resume);
    const stop = useUnifiedAudioStore(state => state.stop);
    const seek = useUnifiedAudioStore(state => state.seek);
    const setPlaybackRate = useUnifiedAudioStore(state => state.setPlaybackRate);
    const setPlayerMode = useUnifiedAudioStore(state => state.setPlayerMode);
    const updateSettings = useUnifiedAudioStore(state => state.updateSettings);
    const setTtsVoice = useUnifiedAudioStore(state => state.setTtsVoice);
    const refreshTtsVoices = useUnifiedAudioStore(state => state.refreshTtsVoices);
    
    // Get settings individually to avoid creating new objects
    const settingsProvider = useUnifiedAudioStore(state => state.settings.tts.provider);
    const settingsRate = useUnifiedAudioStore(state => state.settings.playbackRate);
    const settingsPitch = useUnifiedAudioStore(state => state.settings.tts.pitch);
    const settingsVolume = useUnifiedAudioStore(state => state.settings.volume);
    const settingsVoice = useUnifiedAudioStore(state => state.settings.tts.voice);
    const settingsAutoplay = useUnifiedAudioStore(state => state.settings.autoplay);
    const settingsHighlightText = useUnifiedAudioStore(state => state.settings.tts.highlightText);
    
    const settings = {
      provider: settingsProvider,
      rate: settingsRate,
      pitch: settingsPitch,
      volume: settingsVolume,
      voice: settingsVoice,
      autoplay: settingsAutoplay,
      highlightText: settingsHighlightText
    };
    
    return {
      // State mappings
      isInitialized,
      isPlaying,
      isPaused,
      progress,
      duration,
      currentPosition,
      playbackRate,
      currentText: currentContent?.text || '',
      currentArticle: contentType === 'article' && currentContent ? {
        id: currentContent.id,
        title: currentContent.title,
        source: currentContent.source,
        thumbnail: currentContent.thumbnail,
        textContent: currentContent.text || ''
      } : null,
      playerMode,
      isVisible,
      settings,
      availableVoices,
      error: error ? new Error(error.message) : null,
      
      // Action mappings
      initialize,
      cleanup,
      play: async (text: string, metadata?: any) => {
        await loadContent({
          id: metadata?.id || `tts-${Date.now()}`,
          title: metadata?.title || 'Text to Speech',
          source: metadata?.source || 'Article',
          thumbnail: metadata?.thumbnail,
          textContent: text,
          autoplay: true
        });
      },
      playInMode: async (text: string, mode: UnifiedPlayerMode, metadata?: any) => {
        await loadContent({
          id: metadata?.id || `tts-${Date.now()}`,
          title: metadata?.title || 'Text to Speech',
          source: metadata?.source || 'Article',
          thumbnail: metadata?.thumbnail,
          textContent: text,
          autoplay: true
        });
        setPlayerMode(mode);
      },
      pause,
      resume,
      stop,
      seek,
      setPlaybackRate,
      setPlayerMode,
      setVisibility: (visible: boolean) => {
        if (!visible) {
          setPlayerMode(UnifiedPlayerMode.DISABLED);
        }
      },
      toggleVisibility: () => {
        if (isVisible) {
          setPlayerMode(UnifiedPlayerMode.DISABLED);
        } else {
          setPlayerMode(UnifiedPlayerMode.INLINE);
        }
      },
      updateSettings: (settings: any) => {
        updateSettings({
          volume: settings.volume,
          playbackRate: settings.rate || settings.playbackRate,
          autoplay: settings.autoplay,
          tts: {
            provider: settings.provider,
            voice: settings.voice,
            pitch: settings.pitch,
            highlightText: settings.highlightText
          }
        });
      },
      setVoice: setTtsVoice,
      refreshVoices: refreshTtsVoices
    };
  };
  
  // Add store methods
  useStore.getState = () => useUnifiedAudioStore.getState();
  useStore.setState = (partial: any) => useUnifiedAudioStore.setState(partial);
  useStore.subscribe = (listener: any) => useUnifiedAudioStore.subscribe(listener);
  
  return useStore;
};

export const useTtsStore = createTtsStoreHook();

/**
 * Migration helper for useTtsPlayerStore
 */
const createTtsPlayerStoreHook = () => {
  const useStore = () => {
    const playerMode = useUnifiedAudioStore(state => state.playerMode);
    const isVisible = useUnifiedAudioStore(state => state.isVisible);
    const autoMiniOnScroll = useUnifiedAudioStore(state => state.autoMiniOnScroll);
    const setPlayerMode = useUnifiedAudioStore(state => state.setPlayerMode);
    const setAutoMiniOnScroll = useUnifiedAudioStore(state => state.setAutoMiniOnScroll);
    
    return {
      // State mappings
      playerMode,
      isVisible,
      autoMiniOnScroll,
      
      // Action mappings
      setPlayerMode,
      toggleMiniMode: () => {
        if (playerMode === UnifiedPlayerMode.MINI) {
          setPlayerMode(UnifiedPlayerMode.INLINE);
        } else {
          setPlayerMode(UnifiedPlayerMode.MINI);
        }
      },
      enableInlineMode: () => setPlayerMode(UnifiedPlayerMode.INLINE),
      enableMiniMode: () => setPlayerMode(UnifiedPlayerMode.MINI),
      disablePlayer: () => setPlayerMode(UnifiedPlayerMode.DISABLED),
      setAutoMiniOnScroll
    };
  };
  
  // Add store methods
  useStore.getState = () => useUnifiedAudioStore.getState();
  useStore.setState = (partial: any) => useUnifiedAudioStore.setState(partial);
  useStore.subscribe = (listener: any) => useUnifiedAudioStore.subscribe(listener);
  
  return useStore;
};

export const useTtsPlayerStore = createTtsPlayerStoreHook();

// Export enum for backward compatibility
export { UnifiedPlayerMode as PlayerMode };

// Export selector hooks that match old patterns
export { 
  useAudioPlayback,
  useAudioContent,
  useAudioSettings,
  useAudioUI as useAudioPlayerUI,
  useAudioTts,
  useAudioError as useAudioErrors
} from './useUnifiedAudioStore';