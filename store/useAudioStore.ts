"use client";

/**
 * Unified Audio Store
 * 
 * This module provides a central state store for audio playback,
 * handling both TTS (text-to-speech) and podcast content.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { 
  AudioSource, 
  AudioEvent, 
  AudioMetadata,
  AudioPlayOptions,
  isProgressEvent,
  isErrorEvent
} from '@/lib/audio/audio-source';
import { audioSourceFactory } from '@/lib/audio/audio-source-factory';
import { TtsOptions } from '@/lib/audio/tts-audio-source';
import { PodcastPlayOptions } from '@/lib/audio/podcast-audio-source';

/**
 * Player UI modes
 */
export enum PlayerMode {
  DISABLED = 'disabled',
  INLINE = 'inline',
  MINI = 'mini',
}

/**
 * Content types
 */
export type ContentType = 'article' | 'podcast' | 'none';

/**
 * Error information
 */
export interface AudioError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

/**
 * Playback settings
 */
export interface AudioSettings {
  volume: number;
  playbackRate: number;
  autoplay: boolean;
  rememberPosition: boolean;
  ttsVoiceId?: string;
}

/**
 * Content info with content-specific metadata
 */
export interface AudioContent {
  id: string;
  title: string;
  source: string;
  thumbnail?: string;
  duration: number;
  
  // Content type
  type: ContentType;
  
  // Content data
  text?: string;  // For TTS
  audioUrl?: string;  // For podcasts
  
  // Playback state
  position: number;
  lastPlayed?: number;
}

/**
 * Content position memory
 */
interface PositionMemory {
  [contentId: string]: number;
}

/**
 * Audio store state
 */
interface AudioState {
  // Player state
  isInitialized: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number;  // 0-1 range
  volume: number;
  playbackRate: number;
  
  // Content state
  contentType: ContentType;
  currentContent: AudioContent | null;
  
  // Player UI state
  playerMode: PlayerMode;
  isVisible: boolean;
  
  // Settings
  settings: AudioSettings;
  
  // Audio source
  audioSource: AudioSource | null;
  
  // Position memory (remembers position for each content)
  positionMemory: PositionMemory;
  
  // Error handling
  error: AudioError | null;
  
  // Actions - initialization
  initialize: () => Promise<void>;
  cleanup: () => void;
  
  // Actions - content
  loadAudioContent: (options: {
    id: string;
    title: string;
    source: string;
    thumbnail?: string;
    audioUrl?: string;
    textContent?: string;
    autoplay?: boolean;
  }) => Promise<void>;
  
  // Actions - direct content loading
  playTTS: (text: string, metadata: Partial<AudioMetadata>, options?: TtsOptions) => Promise<void>;
  playAudio: (url: string, metadata: Partial<AudioMetadata>, options?: PodcastPlayOptions) => Promise<void>;
  
  // Actions - playback
  play: (options?: AudioPlayOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  
  // Actions - settings
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  updateSettings: (settings: Partial<AudioSettings>) => void;
  
  // Actions - player UI
  setPlayerMode: (mode: PlayerMode) => void;
  setVisibility: (visible: boolean) => void;
  togglePlayerMode: () => void;
  
  // Actions - error handling
  clearError: () => void;
  
  // Selectors
  getFormattedTime: () => { current: string; duration: string };
  getContentProgress: (contentId: string) => number;
}

/**
 * Format time in seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Default settings
const DEFAULT_SETTINGS: AudioSettings = {
  volume: 1,
  playbackRate: 1,
  autoplay: false,
  rememberPosition: true,
};

// Default state
const defaultState: Partial<AudioState> = {
  isInitialized: false,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  progress: 0,
  volume: DEFAULT_SETTINGS.volume,
  playbackRate: DEFAULT_SETTINGS.playbackRate,
  
  contentType: 'none',
  currentContent: null,
  
  playerMode: PlayerMode.DISABLED,
  isVisible: false,
  
  settings: DEFAULT_SETTINGS,
  
  audioSource: null,
  
  positionMemory: {},
  
  error: null,
};

// Create dummy state with empty functions for SSR
const dummyState: AudioState = {
  ...defaultState as AudioState,
  initialize: async () => {},
  cleanup: () => {},
  loadAudioContent: async () => {},
  playTTS: async () => {},
  playAudio: async () => {},
  play: async () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  seek: () => {},
  setPlaybackRate: () => {},
  setVolume: () => {},
  updateSettings: () => {},
  setPlayerMode: () => {},
  setVisibility: () => {},
  togglePlayerMode: () => {},
  clearError: () => {},
  getFormattedTime: () => ({ current: '0:00', duration: '0:00' }),
  getContentProgress: () => 0,
};

// SSR check function for use throughout the module
const isServer = () => typeof window === 'undefined';

// Create the single store instance - prevents recreation on re-renders
// Store object that is reused across the application
let storeInstance: ReturnType<typeof setupStore> | null = null;

function setupStore() {
  // For SSR, return a stub implementation
  if (isServer()) {
    return {
      getState: () => dummyState,
      setState: () => {},
      subscribe: () => () => {},
      getServerState: () => dummyState,
      api: {
        getState: () => dummyState,
      }
    };
  }
  
  // Set up window unload handler to ensure cleanup across browsers
  window.addEventListener('unload', () => {
    // If we have a store instance and audio is playing, stop it
    if (storeInstance) {
      const state = storeInstance.getState();
      if (state.isPlaying || state.isPaused) {
        state.stop();
      }
    }
  }, { once: true });
  
  return create<AudioState>()(
    persist(
      (set, get) => {
        // Event listeners for audio source
        const eventListeners: { eventType: string; handler: (event: AudioEvent) => void }[] = [];
        
        // Add event listeners to audio source
        const attachEventListeners = (source: AudioSource | null) => {
          if (!source) return;
          
          // Clean up any existing listeners
          clearEventListeners();
          
          // Create new listeners
          const handlePlay = (event: AudioEvent) => {
            set({ 
              isPlaying: true, 
              isPaused: false,
              isLoading: false 
            });
          };
          
          const handlePause = (event: AudioEvent) => {
            set({ 
              isPlaying: false, 
              isPaused: true 
            });
          };
          
          const handleStop = (event: AudioEvent) => {
            set({ 
              isPlaying: false, 
              isPaused: false,
              currentTime: 0,
              progress: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false 
            });
          };
          
          const handleEnd = (event: AudioEvent) => {
            set({ 
              isPlaying: false, 
              isPaused: false,
              progress: 1,
              currentTime: get().duration 
            });
            
            // Clear position memory when content finishes
            const contentId = get().currentContent?.id;
            if (contentId) {
              set(state => ({
                positionMemory: {
                  ...state.positionMemory,
                  [contentId]: 0
                }
              }));
            }
          };
          
          const handleProgress = (event: AudioEvent) => {
            if (isProgressEvent(event)) {
              set({ 
                currentTime: event.currentTime,
                duration: event.duration || get().duration,
                progress: event.progress
              });
              
              // Store position for remembering
              const contentId = get().currentContent?.id;
              if (contentId && get().settings.rememberPosition) {
                // Only update every second to avoid excessive updates
                if (Math.floor(event.currentTime) !== Math.floor(get().positionMemory[contentId] || 0)) {
                  set(state => ({
                    positionMemory: {
                      ...state.positionMemory,
                      [contentId]: event.currentTime
                    }
                  }));
                }
              }
            }
          };
          
          const handleLoading = (event: AudioEvent) => {
            set({ isLoading: true });
          };
          
          const handleLoaded = (event: AudioEvent) => {
            set({ isLoading: false });
          };
          
          const handleRateChange = (event: AudioEvent) => {
            set({ playbackRate: source.playbackRate });
          };
          
          const handleVolumeChange = (event: AudioEvent) => {
            set({ volume: source.volume });
          };
          
          const handleError = (event: AudioEvent) => {
            if (isErrorEvent(event)) {
              set({
                isPlaying: false,
                isPaused: false,
                isLoading: false,
                error: {
                  code: event.code,
                  message: event.message,
                  recoverable: event.recoverable,
                  timestamp: Date.now()
                }
              });
            }
          };
          
          // Register listeners
          source.addEventListener('play', handlePlay);
          source.addEventListener('pause', handlePause);
          source.addEventListener('stop', handleStop);
          source.addEventListener('end', handleEnd);
          source.addEventListener('progress', handleProgress);
          source.addEventListener('loading', handleLoading);
          source.addEventListener('loaded', handleLoaded);
          source.addEventListener('ratechange', handleRateChange);
          source.addEventListener('volumechange', handleVolumeChange);
          source.addEventListener('error', handleError);
          
          // Store listeners so we can remove them later
          eventListeners.push(
            { eventType: 'play', handler: handlePlay },
            { eventType: 'pause', handler: handlePause },
            { eventType: 'stop', handler: handleStop },
            { eventType: 'end', handler: handleEnd },
            { eventType: 'progress', handler: handleProgress },
            { eventType: 'loading', handler: handleLoading },
            { eventType: 'loaded', handler: handleLoaded },
            { eventType: 'ratechange', handler: handleRateChange },
            { eventType: 'volumechange', handler: handleVolumeChange },
            { eventType: 'error', handler: handleError }
          );
        };
        
        // Remove all event listeners
        const clearEventListeners = () => {
          const source = get().audioSource;
          if (!source) return;
          
          for (const { eventType, handler } of eventListeners) {
            source.removeEventListener(eventType, handler);
          }
          
          eventListeners.length = 0;
        };
        
        // Clean up the current audio source
        const cleanupCurrentSource = () => {
          const source = get().audioSource;
          if (source) {
            clearEventListeners();
            source.dispose();
          }
        };
        
        return {
          ...defaultState as AudioState,
          
          // Initialization
          initialize: async () => {
            // Nothing to initialize here - sources are created on demand
            set({ isInitialized: true });
          },
          
          cleanup: () => {
            cleanupCurrentSource();
            set({
              audioSource: null,
              isInitialized: false,
              isPlaying: false,
              isPaused: false,
              currentTime: 0,
              progress: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false
            });
          },
          
          // Content loading
          loadAudioContent: async (options) => {
            try {
              // Stop any current playback
              if (get().isPlaying || get().isPaused) {
                get().stop();
              }
              
              // Clean up existing source
              cleanupCurrentSource();
              
              // Determine content type
              const contentType: ContentType = options.audioUrl ? 'podcast' : 
                                             options.textContent ? 'article' : 'none';
              
              if (contentType === 'none') {
                throw new Error('No content provided');
              }
              
              // Create metadata
              const metadata: AudioMetadata = {
                id: options.id,
                title: options.title,
                source: options.source,
                thumbnail: options.thumbnail
              };
              
              // Create appropriate audio source
              let audioSource: AudioSource;
              if (contentType === 'podcast') {
                audioSource = audioSourceFactory.createAudioSource(
                  options.audioUrl!, metadata
                );
              } else { // article
                audioSource = audioSourceFactory.createTtsSource(
                  options.textContent!, metadata
                );
              }
              
              // Initialize the source
              await audioSource.initialize();
              
              // Create content object
              const content: AudioContent = {
                id: options.id,
                title: options.title,
                source: options.source,
                thumbnail: options.thumbnail,
                duration: 0, // Will be updated after loading
                type: contentType,
                audioUrl: options.audioUrl,
                text: options.textContent,
                position: get().positionMemory[options.id] || 0
              };
              
              // Update state with the new source and content
              set({
                audioSource,
                contentType,
                currentContent: content,
                isLoading: true,
                error: null,
                playerMode: PlayerMode.INLINE,
                isVisible: true
              });
              
              // Attach event listeners
              attachEventListeners(audioSource);
              
              // Apply settings
              audioSource.setVolume(get().settings.volume);
              audioSource.setPlaybackRate(get().settings.playbackRate);
              
              // Load the content
              await audioSource.load();
              
              // Update content with actual duration
              const updatedContent = {
                ...content,
                duration: audioSource.duration
              };
              
              set({
                currentContent: updatedContent,
                duration: audioSource.duration,
                isLoading: false
              });
              
              // Auto-play if requested
              if (options.autoplay || get().settings.autoplay) {
                // Start from remembered position if available
                const startTime = get().positionMemory[options.id] || 0;
                await get().play({ startTime });
              }
              
            } catch (error) {
              console.error('Error loading audio content:', error);
              set({
                isLoading: false,
                error: {
                  code: 'LOAD_ERROR',
                  message: error instanceof Error ? error.message : 'Failed to load audio content',
                  recoverable: true,
                  timestamp: Date.now()
                }
              });
            }
          },
          
          // Direct content methods
          playTTS: async (text, metadata, options) => {
            const id = metadata.id || `tts-${Date.now()}`;
            await get().loadAudioContent({
              id,
              title: metadata.title || 'Text to Speech',
              source: metadata.source || 'Article',
              thumbnail: metadata.thumbnail,
              textContent: text,
              autoplay: true
            });
          },
          
          playAudio: async (url, metadata, options) => {
            const id = metadata.id || `audio-${Date.now()}`;
            await get().loadAudioContent({
              id,
              title: metadata.title || 'Audio',
              source: metadata.source || 'Podcast',
              thumbnail: metadata.thumbnail,
              audioUrl: url,
              autoplay: true
            });
          },
          
          // Playback controls
          play: async (options) => {
            const source = get().audioSource;
            if (!source) return;
            
            try {
              await source.play(options);
              
              // Update UI state
              if (get().playerMode === PlayerMode.DISABLED) {
                set({ playerMode: PlayerMode.INLINE, isVisible: true });
              }
            } catch (error) {
              console.error('Error playing audio:', error);
              set({
                error: {
                  code: 'PLAY_ERROR',
                  message: error instanceof Error ? error.message : 'Failed to play audio',
                  recoverable: true,
                  timestamp: Date.now()
                }
              });
            }
          },
          
          pause: () => {
            const source = get().audioSource;
            if (!source) return;
            
            source.pause();
          },
          
          resume: () => {
            const source = get().audioSource;
            if (!source) return;
            
            source.resume();
          },
          
          stop: () => {
            const source = get().audioSource;
            if (!source) return;
            
            source.stop();
            
            // Update UI state
            set({
              playerMode: PlayerMode.DISABLED,
              isVisible: false
            });
          },
          
          seek: (time) => {
            const source = get().audioSource;
            if (!source) return;
            
            source.seek(time);
          },
          
          // Settings
          setPlaybackRate: (rate) => {
            const source = get().audioSource;
            if (source) {
              source.setPlaybackRate(rate);
            }
            
            set(state => ({
              settings: {
                ...state.settings,
                playbackRate: rate
              }
            }));
          },
          
          setVolume: (volume) => {
            volume = Math.max(0, Math.min(1, volume));
            
            const source = get().audioSource;
            if (source) {
              source.setVolume(volume);
            }
            
            set(state => ({
              settings: {
                ...state.settings,
                volume
              }
            }));
          },
          
          updateSettings: (newSettings) => {
            set(state => {
              const updatedSettings = {
                ...state.settings,
                ...newSettings
              };
              
              // Apply settings to current source if active
              const source = state.audioSource;
              if (source) {
                if (newSettings.volume !== undefined && newSettings.volume !== state.settings.volume) {
                  source.setVolume(newSettings.volume);
                }
                
                if (newSettings.playbackRate !== undefined && newSettings.playbackRate !== state.settings.playbackRate) {
                  source.setPlaybackRate(newSettings.playbackRate);
                }
              }
              
              return { settings: updatedSettings };
            });
          },
          
          // Player UI
          setPlayerMode: (mode) => {
            set({ 
              playerMode: mode,
              isVisible: mode !== PlayerMode.DISABLED
            });
          },
          
          setVisibility: (visible) => {
            set({ isVisible: visible });
          },
          
          togglePlayerMode: () => {
            const currentMode = get().playerMode;
            
            if (currentMode === PlayerMode.INLINE) {
              set({ playerMode: PlayerMode.MINI });
            } else if (currentMode === PlayerMode.MINI) {
              set({ playerMode: PlayerMode.INLINE });
            } else {
              // If disabled, enable as inline
              set({ playerMode: PlayerMode.INLINE, isVisible: true });
            }
          },
          
          // Error handling
          clearError: () => {
            set({ error: null });
          },
          
          // Utility functions
          getFormattedTime: () => {
            const currentTime = get().currentTime || 0;
            const duration = get().duration || 0;
            
            return {
              current: formatTime(currentTime),
              duration: formatTime(duration)
            };
          },
          
          getContentProgress: (contentId) => {
            // Get saved position for a specific content
            const position = get().positionMemory[contentId] || 0;
            
            // If this is the current content, use current position
            if (get().currentContent?.id === contentId) {
              return get().progress;
            }
            
            // Calculate progress from saved position
            const content = get().currentContent;
            if (content && content.id === contentId && content.duration > 0) {
              return Math.min(1, position / content.duration);
            }
            
            // Return saved progress
            return position > 0 ? position : 0;
          }
        };
      },
      {
        name: 'audio-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields
          settings: state.settings,
          positionMemory: state.positionMemory
        }),
      }
    )
  );
}

// Get or create the store instance
const getStore = () => {
  if (!storeInstance) {
    storeInstance = setupStore();
  }
  return storeInstance;
};

// Export the actual store
export const useAudioStore = getStore();

// Default values for selectors
const playbackDefaults = {
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  formattedTime: { current: '0:00', duration: '0:00' },
  playbackRate: 1,
  volume: 1,
  play: async () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  seek: () => {},
  setPlaybackRate: () => {},
  setVolume: () => {}
};

const contentDefaults = {
  currentContent: null,
  contentType: 'none' as ContentType,
  loadContent: async () => {},
  playTTS: async () => {},
  playAudio: async () => {},
  getContentProgress: () => 0
};

const uiDefaults = {
  playerMode: PlayerMode.DISABLED,
  isVisible: false,
  setPlayerMode: () => {},
  setVisibility: () => {},
  togglePlayerMode: () => {}
};

const settingsDefaults = {
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {}
};

const errorDefaults = {
  error: null,
  clearError: () => {}
};

/**
 * Helper to create selector hooks with safe access patterns
 */
function createSelector<T>(selector: (state: AudioState) => T, defaultValue: T) {
  const useSelector = () => {
    if (isServer()) {
      return defaultValue;
    }
    
    return useAudioStore(selector, shallow);
  };
  
  // Add direct state access for imperative code
  useSelector.getState = () => {
    if (isServer()) {
      return defaultValue;
    }
    
    return selector(useAudioStore.getState());
  };
  
  return useSelector;
}

// Export the selector hooks
export const useAudioPlayback = createSelector(
  state => ({
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isLoading: state.isLoading,
    progress: state.progress,
    currentTime: state.currentTime,
    duration: state.duration,
    formattedTime: state.getFormattedTime(),
    playbackRate: state.playbackRate,
    volume: state.volume,
    play: state.play,
    pause: state.pause,
    resume: state.resume,
    stop: state.stop,
    seek: state.seek,
    setPlaybackRate: state.setPlaybackRate,
    setVolume: state.setVolume
  }),
  playbackDefaults
);

export const useAudioContent = createSelector(
  state => ({
    currentContent: state.currentContent,
    contentType: state.contentType,
    loadContent: state.loadAudioContent,
    playTTS: state.playTTS,
    playAudio: state.playAudio,
    getContentProgress: state.getContentProgress
  }),
  contentDefaults
);

export const useAudioPlayerUI = createSelector(
  state => ({
    playerMode: state.playerMode,
    isVisible: state.isVisible,
    setPlayerMode: state.setPlayerMode,
    setVisibility: state.setVisibility,
    togglePlayerMode: state.togglePlayerMode
  }),
  uiDefaults
);

export const useAudioSettings = createSelector(
  state => ({
    settings: state.settings,
    updateSettings: state.updateSettings
  }),
  settingsDefaults
);

export const useAudioErrors = createSelector(
  state => ({
    error: state.error,
    clearError: state.clearError
  }),
  errorDefaults
);

export default useAudioStore;