// ABOUTME: Fixed unified audio store with proper memoization using shallow comparison
// ABOUTME: Single source of truth for all audio state management in the application

"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { UnifiedAudioSource, createAudioSource, AudioSourceType, AudioMetadata } from '@/lib/audio/unified-audio-source';

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
 * TTS Provider types
 */
export type TtsProvider = 'browser' | 'elevenlabs' | 'none';

/**
 * Voice interface for TTS
 */
export interface Voice {
  id: string;
  name: string;
  lang: string;
  provider: TtsProvider;
}

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
 * Unified playback settings
 */
export interface AudioSettings {
  // General audio settings
  volume: number;
  playbackRate: number;
  autoplay: boolean;
  rememberPosition: boolean;
  
  // TTS-specific settings
  tts: {
    provider: TtsProvider;
    voice: Voice | null;
    pitch: number;
    highlightText: boolean;
  };
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
 * Unified Audio store state
 */
export interface UnifiedAudioState {
  // === Core Playback State ===
  isInitialized: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number;  // 0-1 range
  
  // === Content State ===
  contentType: ContentType;
  currentContent: AudioContent | null;
  
  // === UI State ===
  playerMode: PlayerMode;
  isVisible: boolean;
  autoMiniOnScroll: boolean;
  
  // === Settings ===
  settings: AudioSettings;
  
  // === TTS State ===
  tts: {
    availableVoices: Voice[];
    isSupported: boolean;
    currentUtterance: SpeechSynthesisUtterance | null;
  };
  
  // === Error State ===
  error: AudioError | null;
  
  // === Position Memory ===
  positionMemory: PositionMemory;
  
  // === Audio Source ===
  audioSource: UnifiedAudioSource | null;
  
  // === Actions - Initialization ===
  initialize: () => Promise<void>;
  cleanup: () => void;
  
  // === Actions - Content Loading ===
  loadContent: (options: {
    id: string;
    title: string;
    source: string;
    thumbnail?: string;
    // Either audio URL or text content
    audioUrl?: string;
    textContent?: string;
    // Options
    autoplay?: boolean;
    startTime?: number;
  }) => Promise<void>;
  
  // === Actions - Playback Control ===
  play: (options?: { startTime?: number }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  
  // === Actions - Settings ===
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  updateSettings: (settings: DeepPartial<AudioSettings>) => void;
  
  // === Actions - TTS Specific ===
  setTtsVoice: (voice: Voice) => void;
  refreshTtsVoices: () => Promise<Voice[]>;
  setTtsPitch: (pitch: number) => void;
  setTtsProvider: (provider: TtsProvider) => void;
  
  // === Actions - UI Control ===
  setPlayerMode: (mode: PlayerMode) => void;
  togglePlayerMode: () => void;
  setAutoMiniOnScroll: (enabled: boolean) => void;
  
  // === Actions - Error Handling ===
  clearError: () => void;
  
  // === Computed Values / Selectors ===
  getFormattedTime: () => { current: string; duration: string };
  getContentProgress: (contentId: string) => number;
  canSeek: () => boolean;
  isContentLoaded: () => boolean;
}

// Type helper for deep partial
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

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
  tts: {
    provider: 'browser',
    voice: null,
    pitch: 1,
    highlightText: true,
  }
};

// Default state
const defaultState: Partial<UnifiedAudioState> = {
  isInitialized: false,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  progress: 0,
  
  contentType: 'none',
  currentContent: null,
  
  playerMode: PlayerMode.DISABLED,
  isVisible: false,
  autoMiniOnScroll: true,
  
  settings: DEFAULT_SETTINGS,
  
  tts: {
    availableVoices: [],
    isSupported: false,
    currentUtterance: null,
  },
  
  positionMemory: {},
  
  error: null,
  audioSource: null,
};

// Helper to safely get speech synthesis API
const getSpeechSynthesis = (): SpeechSynthesis | null => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
};

// Helper to safely get speech utterance
const getSpeechUtterance = (): typeof SpeechSynthesisUtterance | null => {
  return typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window
    ? window.SpeechSynthesisUtterance
    : null;
};

// Check if browser supports speech synthesis
const isTtsSupported = (): boolean => {
  return !!(getSpeechSynthesis() && getSpeechUtterance());
};

// Voice loading helper
const loadVoices = async (): Promise<Voice[]> => {
  const synth = getSpeechSynthesis();
  if (!synth) return [];
  
  // Some browsers (especially Chrome) load voices asynchronously
  if (synth.getVoices().length > 0) {
    return synth.getVoices().map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      provider: 'browser' as TtsProvider,
    }));
  }
  
  // Wait for voices to load
  return new Promise((resolve) => {
    const voicesChangedHandler = () => {
      const voices = synth.getVoices().map(voice => ({
        id: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        provider: 'browser' as TtsProvider,
      }));
      
      synth.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve(voices);
    };
    
    synth.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Safety timeout in case the event never fires
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', voicesChangedHandler);
      resolve([]);
    }, 1000);
  });
};

// SSR check function
const isServer = () => typeof window === 'undefined';

// Create the unified audio store with subscribeWithSelector middleware
export const useUnifiedAudioStore = create<UnifiedAudioState>()(
  subscribeWithSelector(
    persist(
      (set, get) => {
        // Progress update interval for TTS
        let progressInterval: NodeJS.Timeout | null = null;
        
        // Clean up audio source
        const cleanupAudioSource = () => {
          const source = get().audioSource;
          if (source) {
            source.dispose();
          }
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
        };
        
        // Start progress tracking for TTS
        const startTtsProgressTracking = (duration: number) => {
          const startTime = Date.now();
          progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            set({
              currentTime: elapsed,
              progress,
            });
            
            if (progress >= 1) {
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
            }
          }, 100);
        };
        
        return {
          ...defaultState as UnifiedAudioState,
          
          // === Initialization ===
          initialize: async () => {
            // Check TTS support
            const ttsSupported = isTtsSupported();
            
            // Load voices if TTS is supported
            let voices: Voice[] = [];
            if (ttsSupported) {
              voices = await loadVoices();
            }
            
            set({
              isInitialized: true,
              tts: {
                isSupported: ttsSupported,
                availableVoices: voices,
                currentUtterance: null,
              }
            });
          },
          
          cleanup: () => {
            cleanupAudioSource();
            
            set({
              audioSource: null,
              isInitialized: false,
              isPlaying: false,
              isPaused: false,
              currentTime: 0,
              progress: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false,
              tts: {
                ...get().tts,
                currentUtterance: null,
              }
            });
          },
          
          // === Content Loading ===
          loadContent: async (options) => {
            try {
              // Stop any current playback
              if (get().isPlaying || get().isPaused) {
                get().stop();
              }
              
              // Clean up existing resources
              cleanupAudioSource();
              
              // Determine content type
              const contentType: ContentType = options.audioUrl ? 'podcast' : 
                                             options.textContent ? 'article' : 'none';
              
              if (contentType === 'none') {
                throw new Error('No content provided');
              }
              
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
              
              // Update state
              set({
                contentType,
                currentContent: content,
                isLoading: true,
                error: null,
                playerMode: PlayerMode.INLINE,
                isVisible: true
              });
              
              // Create audio source
              const sourceType: AudioSourceType = contentType === 'podcast' ? 'podcast' : 'tts';
              const sourceContent = contentType === 'podcast' ? options.audioUrl! : options.textContent!;
              const metadata: AudioMetadata = {
                id: options.id,
                title: options.title,
                source: options.source,
                thumbnail: options.thumbnail
              };
              
              const audioSource = createAudioSource(sourceType, sourceContent, metadata);
              
              // Setup event listeners
              audioSource.addEventListener('loaded', () => {
                set({
                  duration: audioSource.duration,
                  currentContent: { ...content, duration: audioSource.duration },
                  isLoading: false
                });
              });
              
              audioSource.addEventListener('progress', (event: any) => {
                set({
                  currentTime: event.currentTime,
                  progress: event.progress
                });
                
                // Save position for podcasts
                if (contentType === 'podcast') {
                  const contentId = get().currentContent?.id;
                  if (contentId && get().settings.rememberPosition) {
                    set(state => ({
                      positionMemory: {
                        ...state.positionMemory,
                        [contentId]: event.currentTime
                      }
                    }));
                  }
                }
              });
              
              audioSource.addEventListener('play', () => {
                set({ isPlaying: true, isPaused: false });
                if (contentType === 'article') {
                  startTtsProgressTracking(audioSource.duration);
                }
              });
              
              audioSource.addEventListener('pause', () => {
                set({ isPlaying: false, isPaused: true });
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              });
              
              audioSource.addEventListener('end', () => {
                set({ 
                  isPlaying: false, 
                  isPaused: false,
                  progress: 1,
                  currentTime: audioSource.duration
                });
                
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
                
                // Clear position memory
                const contentId = get().currentContent?.id;
                if (contentId) {
                  set(state => ({
                    positionMemory: {
                      ...state.positionMemory,
                      [contentId]: 0
                    }
                  }));
                }
              });
              
              audioSource.addEventListener('error', (event: any) => {
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
                
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              });
              
              // Initialize and load
              await audioSource.initialize();
              
              // Apply settings
              audioSource.setVolume(get().settings.volume);
              audioSource.setPlaybackRate(get().settings.playbackRate);
              
              set({ audioSource, isLoading: false });
              
              // Load content
              await audioSource.load();
              
              // Auto-play if requested
              if (options.autoplay || get().settings.autoplay) {
                const startTime = options.startTime || get().positionMemory[options.id] || 0;
                await get().play({ startTime });
              }
              
            } catch (error) {
              console.error('Error loading content:', error);
              set({
                isLoading: false,
                error: {
                  code: 'LOAD_ERROR',
                  message: error instanceof Error ? error.message : 'Failed to load content',
                  recoverable: true,
                  timestamp: Date.now()
                }
              });
            }
          },
          
          // === Playback Control ===
          play: async (options) => {
            const { audioSource } = get();
            
            if (!audioSource) return;
            
            try {
              await audioSource.play(options);
              
              // Update UI state
              if (get().playerMode === PlayerMode.DISABLED) {
                set({ playerMode: PlayerMode.INLINE, isVisible: true });
              }
              
            } catch (error) {
              console.error('Error playing:', error);
              set({
                error: {
                  code: 'PLAY_ERROR',
                  message: error instanceof Error ? error.message : 'Failed to play',
                  recoverable: true,
                  timestamp: Date.now()
                }
              });
            }
          },
          
          pause: () => {
            const { audioSource } = get();
            if (audioSource) {
              audioSource.pause();
            }
          },
          
          resume: () => {
            const { audioSource } = get();
            if (audioSource) {
              audioSource.resume();
            }
          },
          
          stop: () => {
            const { audioSource } = get();
            if (audioSource) {
              audioSource.stop();
            }
            
            set({
              isPlaying: false,
              isPaused: false,
              currentTime: 0,
              progress: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false
            });
          },
          
          seek: (time) => {
            const { audioSource } = get();
            if (audioSource) {
              audioSource.seek(time);
            }
          },
          
          // === Settings ===
          setVolume: (volume) => {
            volume = Math.max(0, Math.min(1, volume));
            
            const { audioSource } = get();
            if (audioSource) {
              audioSource.setVolume(volume);
            }
            
            set(state => ({
              settings: {
                ...state.settings,
                volume
              }
            }));
          },
          
          setPlaybackRate: (rate) => {
            const { audioSource } = get();
            if (audioSource) {
              audioSource.setPlaybackRate(rate);
            }
            
            set(state => ({
              settings: {
                ...state.settings,
                playbackRate: rate
              }
            }));
          },
          
          updateSettings: (newSettings) => {
            set(state => {
              const updatedSettings = {
                ...state.settings,
                ...newSettings,
                tts: {
                  ...state.settings.tts,
                  ...(newSettings.tts || {})
                }
              };
              
              // Apply settings to current playback
              const { audioSource } = state;
              if (audioSource) {
                if (newSettings.volume !== undefined) {
                  audioSource.setVolume(newSettings.volume);
                }
                if (newSettings.playbackRate !== undefined) {
                  audioSource.setPlaybackRate(newSettings.playbackRate);
                }
              }
              
              return { settings: updatedSettings };
            });
          },
          
          // === TTS Specific ===
          setTtsVoice: (voice) => {
            set(state => ({
              settings: {
                ...state.settings,
                tts: {
                  ...state.settings.tts,
                  voice
                }
              }
            }));
          },
          
          refreshTtsVoices: async () => {
            const voices = await loadVoices();
            set(state => ({
              tts: {
                ...state.tts,
                availableVoices: voices
              }
            }));
            return voices;
          },
          
          setTtsPitch: (pitch) => {
            set(state => ({
              settings: {
                ...state.settings,
                tts: {
                  ...state.settings.tts,
                  pitch: Math.max(0.5, Math.min(2, pitch))
                }
              }
            }));
          },
          
          setTtsProvider: (provider) => {
            set(state => ({
              settings: {
                ...state.settings,
                tts: {
                  ...state.settings.tts,
                  provider
                }
              }
            }));
          },
          
          // === UI Control ===
          setPlayerMode: (mode) => {
            set({ 
              playerMode: mode,
              isVisible: mode !== PlayerMode.DISABLED
            });
          },
          
          togglePlayerMode: () => {
            const currentMode = get().playerMode;
            
            if (currentMode === PlayerMode.INLINE) {
              set({ playerMode: PlayerMode.MINI });
            } else if (currentMode === PlayerMode.MINI) {
              set({ playerMode: PlayerMode.INLINE });
            } else {
              set({ playerMode: PlayerMode.INLINE, isVisible: true });
            }
          },
          
          setAutoMiniOnScroll: (enabled) => {
            set({ autoMiniOnScroll: enabled });
          },
          
          // === Error Handling ===
          clearError: () => {
            set({ error: null });
          },
          
          // === Computed Values ===
          getFormattedTime: () => {
            const currentTime = get().currentTime || 0;
            const duration = get().duration || 0;
            
            return {
              current: formatTime(currentTime),
              duration: formatTime(duration)
            };
          },
          
          getContentProgress: (contentId) => {
            const position = get().positionMemory[contentId] || 0;
            
            if (get().currentContent?.id === contentId) {
              return get().progress;
            }
            
            return position > 0 ? position : 0;
          },
          
          canSeek: () => {
            // Only podcast content can be seeked
            return get().contentType === 'podcast';
          },
          
          isContentLoaded: () => {
            return get().currentContent !== null && !get().isLoading;
          }
        };
      },
      {
        name: 'unified-audio-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields
          settings: state.settings,
          positionMemory: state.positionMemory,
          autoMiniOnScroll: state.autoMiniOnScroll
        }),
      }
    )
  )
);

// Selector definitions with proper memoization
const audioPlaybackSelector = (state: UnifiedAudioState) => ({
  isPlaying: state.isPlaying,
  isPaused: state.isPaused,
  isLoading: state.isLoading,
  progress: state.progress,
  currentTime: state.currentTime,
  duration: state.duration,
  play: state.play,
  pause: state.pause,
  resume: state.resume,
  stop: state.stop,
  seek: state.seek,
  canSeek: state.canSeek,
  getFormattedTime: state.getFormattedTime
});

const audioContentSelector = (state: UnifiedAudioState) => ({
  currentContent: state.currentContent,
  contentType: state.contentType,
  loadContent: state.loadContent,
  getContentProgress: state.getContentProgress,
  isContentLoaded: state.isContentLoaded
});

const audioSettingsSelector = (state: UnifiedAudioState) => ({
  settings: state.settings,
  volume: state.settings.volume,
  playbackRate: state.settings.playbackRate,
  setVolume: state.setVolume,
  setPlaybackRate: state.setPlaybackRate,
  updateSettings: state.updateSettings
});

const audioUISelector = (state: UnifiedAudioState) => ({
  playerMode: state.playerMode,
  isVisible: state.isVisible,
  autoMiniOnScroll: state.autoMiniOnScroll,
  setPlayerMode: state.setPlayerMode,
  togglePlayerMode: state.togglePlayerMode,
  setAutoMiniOnScroll: state.setAutoMiniOnScroll
});

const audioTtsSelector = (state: UnifiedAudioState) => ({
  ttsSettings: state.settings.tts,
  availableVoices: state.tts.availableVoices,
  isSupported: state.tts.isSupported,
  setTtsVoice: state.setTtsVoice,
  refreshTtsVoices: state.refreshTtsVoices,
  setTtsPitch: state.setTtsPitch,
  setTtsProvider: state.setTtsProvider
});

const audioErrorSelector = (state: UnifiedAudioState) => ({
  error: state.error,
  clearError: state.clearError
});

// Export hooks using individual selectors to avoid object creation
export const useAudioPlayback = () => {
  const isPlaying = useUnifiedAudioStore(state => state.isPlaying);
  const isPaused = useUnifiedAudioStore(state => state.isPaused);
  const isLoading = useUnifiedAudioStore(state => state.isLoading);
  const progress = useUnifiedAudioStore(state => state.progress);
  const currentTime = useUnifiedAudioStore(state => state.currentTime);
  const duration = useUnifiedAudioStore(state => state.duration);
  const play = useUnifiedAudioStore(state => state.play);
  const pause = useUnifiedAudioStore(state => state.pause);
  const resume = useUnifiedAudioStore(state => state.resume);
  const stop = useUnifiedAudioStore(state => state.stop);
  const seek = useUnifiedAudioStore(state => state.seek);
  const canSeek = useUnifiedAudioStore(state => state.canSeek);
  const getFormattedTime = useUnifiedAudioStore(state => state.getFormattedTime);
  
  return {
    isPlaying,
    isPaused,
    isLoading,
    progress,
    currentTime,
    duration,
    play,
    pause,
    resume,
    stop,
    seek,
    canSeek,
    getFormattedTime
  };
};

export const useAudioContent = () => {
  const currentContent = useUnifiedAudioStore(state => state.currentContent);
  const contentType = useUnifiedAudioStore(state => state.contentType);
  const loadContent = useUnifiedAudioStore(state => state.loadContent);
  const getContentProgress = useUnifiedAudioStore(state => state.getContentProgress);
  const isContentLoaded = useUnifiedAudioStore(state => state.isContentLoaded);
  
  return {
    currentContent,
    contentType,
    loadContent,
    getContentProgress,
    isContentLoaded
  };
};

export const useAudioSettings = () => {
  const settings = useUnifiedAudioStore(state => state.settings);
  const volume = useUnifiedAudioStore(state => state.settings.volume);
  const playbackRate = useUnifiedAudioStore(state => state.settings.playbackRate);
  const setVolume = useUnifiedAudioStore(state => state.setVolume);
  const setPlaybackRate = useUnifiedAudioStore(state => state.setPlaybackRate);
  const updateSettings = useUnifiedAudioStore(state => state.updateSettings);
  
  return {
    settings,
    volume,
    playbackRate,
    setVolume,
    setPlaybackRate,
    updateSettings
  };
};

export const useAudioUI = () => {
  const playerMode = useUnifiedAudioStore(state => state.playerMode);
  const isVisible = useUnifiedAudioStore(state => state.isVisible);
  const autoMiniOnScroll = useUnifiedAudioStore(state => state.autoMiniOnScroll);
  const setPlayerMode = useUnifiedAudioStore(state => state.setPlayerMode);
  const togglePlayerMode = useUnifiedAudioStore(state => state.togglePlayerMode);
  const setAutoMiniOnScroll = useUnifiedAudioStore(state => state.setAutoMiniOnScroll);
  
  return {
    playerMode,
    isVisible,
    autoMiniOnScroll,
    setPlayerMode,
    togglePlayerMode,
    setAutoMiniOnScroll
  };
};

export const useAudioTts = () => {
  const ttsSettings = useUnifiedAudioStore(state => state.settings.tts);
  const availableVoices = useUnifiedAudioStore(state => state.tts.availableVoices);
  const isSupported = useUnifiedAudioStore(state => state.tts.isSupported);
  const setTtsVoice = useUnifiedAudioStore(state => state.setTtsVoice);
  const refreshTtsVoices = useUnifiedAudioStore(state => state.refreshTtsVoices);
  const setTtsPitch = useUnifiedAudioStore(state => state.setTtsPitch);
  const setTtsProvider = useUnifiedAudioStore(state => state.setTtsProvider);
  
  return {
    ttsSettings,
    availableVoices,
    isSupported,
    setTtsVoice,
    refreshTtsVoices,
    setTtsPitch,
    setTtsProvider
  };
};

export const useAudioError = () => {
  const error = useUnifiedAudioStore(state => state.error);
  const clearError = useUnifiedAudioStore(state => state.clearError);
  
  return {
    error,
    clearError
  };
};

export default useUnifiedAudioStore;