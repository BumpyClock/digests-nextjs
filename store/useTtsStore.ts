import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

// Types
export type TtsProvider = 'browser' | 'elevenlabs' | 'none';

export enum PlayerMode {
  DISABLED = 'disabled',
  INLINE = 'inline',
  MINI = 'mini',
}

export interface Voice {
  id: string;
  name: string;
  lang: string;
  provider: TtsProvider;
}

export interface TtsSettings {
  provider: TtsProvider;
  rate: number;
  pitch: number;
  volume: number;
  voice: Voice | null;
  autoplay: boolean;
  highlightText: boolean;
}

export interface ArticleMetadata {
  id: string;
  title: string;
  source: string;
  thumbnail?: string;
  textContent: string;
}

// State interface
export interface TtsState {
  // Engine state
  isInitialized: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number;
  duration: number;
  currentPosition: number;
  playbackRate: number;
  
  // Current content
  currentText: string;
  currentArticle: ArticleMetadata | null;
  
  // UI state
  playerMode: PlayerMode;
  isVisible: boolean;
  
  // User settings
  settings: TtsSettings;
  availableVoices: Voice[];

  // Error state
  error: Error | null;
  
  // Actions - initialization
  initialize: () => Promise<void>;
  cleanup: () => void;
  
  // Actions - playback
  play: (text: string, metadata?: Partial<ArticleMetadata>) => Promise<void>;
  playInMode: (text: string, mode: PlayerMode, metadata?: Partial<ArticleMetadata>) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (position: number) => void;
  setPlaybackRate: (rate: number) => void;
  
  // Actions - UI
  setPlayerMode: (mode: PlayerMode) => void;
  setVisibility: (visible: boolean) => void;
  toggleVisibility: () => void;
  
  // Actions - settings
  updateSettings: (settings: Partial<TtsSettings>) => void;
  setVoice: (voice: Voice) => void;
  refreshVoices: () => Promise<Voice[]>;
}

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

// Default settings
const DEFAULT_SETTINGS: TtsSettings = {
  provider: 'browser',
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: null,
  autoplay: false,
  highlightText: true,
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

// Default state
const defaultState: Partial<TtsState> = {
  isInitialized: false,
  isPlaying: false,
  isPaused: false,
  progress: 0,
  duration: 0,
  currentPosition: 0,
  playbackRate: 1,
  
  currentText: '',
  currentArticle: null,
  
  playerMode: PlayerMode.DISABLED,
  isVisible: false,
  
  settings: DEFAULT_SETTINGS,
  availableVoices: [],
  
  error: null,
};

// SSR helper that provides empty functions
const createServerStore = () => ({
  ...defaultState,
  initialize: async () => {},
  cleanup: () => {},
  play: async () => {},
  playInMode: async () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  seek: () => {},
  setPlaybackRate: () => {},
  setPlayerMode: () => {},
  setVisibility: () => {},
  toggleVisibility: () => {},
  updateSettings: () => {},
  setVoice: () => {},
  refreshVoices: async () => []
} as TtsState);

// Function that creates and configures the store
function createTtsStore() {
  // For SSR, return a stub store
  if (typeof window === 'undefined') {
    // This function allows us to still use the original Zustand syntax
    const serverSideStore = {
      getState: () => createServerStore(),
      setState: () => {},
      subscribe: () => () => {},
      getServerSnapshot: () => createServerStore()
    };
    return serverSideStore as ReturnType<typeof create<TtsState>>;
  }
  
  // For client-side, create the real store
  return create<TtsState>()(
    persist(
      (set, get) => {
        // State for tracking utterance and animation frame
        let currentUtterance: SpeechSynthesisUtterance | null = null;
        let rafId: number | null = null;
        
        // Track boundary events for highlighting
        let paragraphBoundaries: { start: number; end: number; text: string }[] = [];
        let currentParagraphIndex = -1;
        
        // Helper to update progress
        const updateProgress = () => {
          const synth = getSpeechSynthesis();
          if (!synth || !currentUtterance || !get().isPlaying) {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            return;
          }
          
          // Calculate current position and progress
          const elapsedTime = (performance.now() - (currentUtterance.startTime || 0));
          const duration = get().duration || 1;
          const progress = Math.min(100, (elapsedTime / duration) * 100);
          
          set({
            progress,
            currentPosition: elapsedTime,
          });
          
          // Continue updating if still playing
          if (get().isPlaying) {
            rafId = requestAnimationFrame(updateProgress);
          }
        };
        
        // Helper to clean up resources
        const cleanupResources = () => {
          const synth = getSpeechSynthesis();
          if (synth) {
            synth.cancel();
          }
          
          if (currentUtterance) {
            // Remove all event listeners
            currentUtterance.onstart = null;
            currentUtterance.onend = null;
            currentUtterance.onpause = null;
            currentUtterance.onresume = null;
            currentUtterance.onerror = null;
            currentUtterance.onboundary = null;
            currentUtterance = null;
          }
          
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          
          paragraphBoundaries = [];
          currentParagraphIndex = -1;
        };
        
        // Estimate duration based on text length and rate
        const estimateDuration = (text: string, rate: number): number => {
          if (!text) return 0;
          
          // Average speaking rate is about 150 words per minute
          const wordsPerMinute = 150 * rate;
          const wordCount = text.split(/\s+/).length;
          return (wordCount / wordsPerMinute) * 60 * 1000;
        };
        
        // Split text into paragraphs for boundary tracking
        const prepareParagraphs = (text: string) => {
          if (!text) {
            paragraphBoundaries = [];
            return;
          }
          
          const paragraphs = text
            .split(/\n+/)
            .filter(p => p.trim().length > 0);
          
          let charIndex = 0;
          paragraphBoundaries = paragraphs.map(p => {
            const start = charIndex;
            charIndex += p.length + 1; // +1 for the newline
            return {
              start,
              end: charIndex - 1,
              text: p,
            };
          });
        };
        
        return {
          ...defaultState as TtsState,
          
          // Initialization
          initialize: async () => {
            if (!isTtsSupported()) {
              set({ 
                error: new Error('Text-to-speech is not supported in this browser'),
                isInitialized: false 
              });
              return;
            }
            
            try {
              const voices = await loadVoices();
              let { settings } = get();
              
              // If we have no voice set but voices are available, set a default
              if (!settings.voice && voices.length > 0) {
                // Prefer English voices if available
                const englishVoice = voices.find(v => v.lang.startsWith('en'));
                settings = {
                  ...settings,
                  voice: englishVoice || voices[0],
                };
              }
              
              set({ 
                availableVoices: voices,
                settings,
                isInitialized: true,
                error: null
              });
            } catch (error) {
              set({ 
                error: error instanceof Error ? error : new Error('Failed to initialize TTS'),
                isInitialized: false 
              });
            }
          },
          
          cleanup: () => {
            cleanupResources();
            set({
              isPlaying: false,
              isPaused: false,
              progress: 0,
              currentPosition: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false,
              currentText: '',
              currentArticle: null,
            });
          },
          
          // Playback actions
          play: async (text, metadata) => {
            const state = get();
            
            // Stop any current playback
            if (state.isPlaying || state.isPaused) {
              get().stop();
            }
            
            const synth = getSpeechSynthesis();
            const SpeechUtterance = getSpeechUtterance();
            
            if (!synth || !SpeechUtterance || !state.isInitialized) {
              set({ error: new Error('TTS is not initialized or not supported') });
              return;
            }
            
            try {
              // Create article metadata
              const articleId = metadata?.id || `tts-${Date.now()}`;
              const articleMetadata: ArticleMetadata = {
                id: articleId,
                title: metadata?.title || 'Text-to-Speech',
                source: metadata?.source || 'Article Reader',
                thumbnail: metadata?.thumbnail || '/placeholder-rss.svg',
                textContent: text,
              };
              
              // Prepare text
              const cleanText = text.trim();
              if (!cleanText) return;
              
              prepareParagraphs(cleanText);
              
              // Create utterance
              const utterance = new SpeechUtterance(cleanText);
              
              // Apply settings
              utterance.rate = state.settings.rate;
              utterance.pitch = state.settings.pitch;
              utterance.volume = state.settings.volume;
              
              // Set voice if available
              if (state.settings.voice) {
                const matchingVoice = synth.getVoices().find(
                  v => v.voiceURI === state.settings.voice?.id
                );
                if (matchingVoice) {
                  utterance.voice = matchingVoice;
                }
              }
              
              // Estimate duration
              const estimatedDuration = estimateDuration(cleanText, utterance.rate);
              
              // Set event handlers
              utterance.onstart = (event) => {
                utterance.startTime = performance.now();
                set({ isPlaying: true, isPaused: false });
                rafId = requestAnimationFrame(updateProgress);
              };
              
              utterance.onend = () => {
                cleanupResources();
                set({
                  isPlaying: false,
                  isPaused: false,
                  progress: 100,
                  currentPosition: get().duration,
                });
              };
              
              utterance.onpause = () => {
                set({ isPlaying: false, isPaused: true });
                if (rafId !== null) {
                  cancelAnimationFrame(rafId);
                  rafId = null;
                }
              };
              
              utterance.onresume = () => {
                set({ isPlaying: true, isPaused: false });
                rafId = requestAnimationFrame(updateProgress);
              };
              
              utterance.onerror = (event) => {
                cleanupResources();
                set({
                  isPlaying: false,
                  isPaused: false,
                  error: new Error(`Speech synthesis error: ${event.error}`),
                });
              };
              
              // Handle text boundaries for highlighting
              if (state.settings.highlightText) {
                utterance.onboundary = (event) => {
                  if (event.name !== 'word') return;
                  
                  // Find which paragraph we're in
                  const charIndex = event.charIndex;
                  const paragraphIndex = paragraphBoundaries.findIndex(
                    p => charIndex >= p.start && charIndex <= p.end
                  );
                  
                  if (paragraphIndex !== -1 && paragraphIndex !== currentParagraphIndex) {
                    currentParagraphIndex = paragraphIndex;
                    // Here you could dispatch an event or update state for highlighting
                    // the current paragraph in the UI
                  }
                };
              }
              
              // Start playing
              currentUtterance = utterance;
              synth.speak(utterance);
              
              // Update state
              set({
                isPlaying: true,
                isPaused: false,
                progress: 0,
                currentPosition: 0,
                duration: estimatedDuration,
                currentText: cleanText,
                currentArticle: articleMetadata,
                isVisible: true,
                playerMode: state.playerMode === PlayerMode.DISABLED 
                  ? PlayerMode.INLINE 
                  : state.playerMode,
                playbackRate: utterance.rate,
              });
            } catch (error) {
              cleanupResources();
              set({
                error: error instanceof Error 
                  ? error 
                  : new Error('Failed to start TTS playback'),
                isPlaying: false,
                isPaused: false,
              });
            }
          },
          
          playInMode: async (text, mode, metadata) => {
            // First set the mode
            set({ playerMode: mode });
            
            // Then play the text
            await get().play(text, metadata);
          },
          
          pause: () => {
            const synth = getSpeechSynthesis();
            if (synth && get().isPlaying) {
              synth.pause();
              set({ isPlaying: false, isPaused: true });
              
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            }
          },
          
          resume: () => {
            const synth = getSpeechSynthesis();
            if (synth && get().isPaused) {
              synth.resume();
              set({ isPlaying: true, isPaused: false });
              rafId = requestAnimationFrame(updateProgress);
            }
          },
          
          stop: () => {
            cleanupResources();
            set({
              isPlaying: false,
              isPaused: false,
              progress: 0,
              currentPosition: 0,
              playerMode: PlayerMode.DISABLED,
              isVisible: false,
            });
          },
          
          seek: (position) => {
            // Web Speech API doesn't support seeking directly
            // We need to stop and restart from the approximate position
            
            const state = get();
            if (!state.isPlaying && !state.isPaused) return;
            
            const synth = getSpeechSynthesis();
            const SpeechUtterance = getSpeechUtterance();
            
            if (!synth || !SpeechUtterance || !state.currentText) return;
            
            // Calculate approximate character position
            const text = state.currentText;
            const totalChars = text.length;
            const seekRatio = position / state.duration;
            const charPosition = Math.floor(totalChars * seekRatio);
            
            // Find the nearest sentence or paragraph start
            let startPos = 0;
            const sentences = text.split(/[.!?]+\s/);
            let charCount = 0;
            
            for (const sentence of sentences) {
              const nextCharCount = charCount + sentence.length + 2; // +2 for punctuation and space
              if (nextCharCount > charPosition) break;
              charCount = nextCharCount;
              startPos = charCount;
            }
            
            // Create new text starting from this position
            const remainingText = text.substring(startPos);
            
            // Stop current playback
            synth.cancel();
            
            // Create new utterance
            const utterance = new SpeechUtterance(remainingText);
            
            // Apply settings
            utterance.rate = state.settings.rate;
            utterance.pitch = state.settings.pitch;
            utterance.volume = state.settings.volume;
            
            // Set voice if available
            if (state.settings.voice) {
              const matchingVoice = synth.getVoices().find(
                v => v.voiceURI === state.settings.voice?.id
              );
              if (matchingVoice) {
                utterance.voice = matchingVoice;
              }
            }
            
            // Set event handlers
            utterance.onstart = (event) => {
              utterance.startTime = performance.now() - position;
              set({ isPlaying: true, isPaused: false });
              rafId = requestAnimationFrame(updateProgress);
            };
            
            utterance.onend = () => {
              cleanupResources();
              set({
                isPlaying: false,
                isPaused: false,
                progress: 100,
                currentPosition: get().duration,
              });
            };
            
            utterance.onpause = () => {
              set({ isPlaying: false, isPaused: true });
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            };
            
            utterance.onresume = () => {
              set({ isPlaying: true, isPaused: false });
              rafId = requestAnimationFrame(updateProgress);
            };
            
            utterance.onerror = (event) => {
              cleanupResources();
              set({
                isPlaying: false,
                isPaused: false,
                error: new Error(`Speech synthesis error: ${event.error}`),
              });
            };
            
            // Start playing
            currentUtterance = utterance;
            synth.speak(utterance);
            
            // Update position
            set({
              currentPosition: position,
              progress: (position / state.duration) * 100,
            });
          },
          
          setPlaybackRate: (rate) => {
            const synth = getSpeechSynthesis();
            if (!synth || !currentUtterance) return;
            
            // Need to restart playback with new rate
            const isPlaying = get().isPlaying;
            const text = get().currentText;
            const position = get().currentPosition;
            
            // Update settings
            set(state => ({
              settings: {
                ...state.settings,
                rate,
              },
              playbackRate: rate,
            }));
            
            // Only restart if already playing
            if (isPlaying && text) {
              // Stop current playback
              synth.cancel();
              
              // Recalculate duration
              const newDuration = estimateDuration(text, rate);
              set({ duration: newDuration });
              
              // Create new utterance
              const utterance = new SpeechUtterance(text);
              
              // Apply settings
              utterance.rate = rate;
              utterance.pitch = get().settings.pitch;
              utterance.volume = get().settings.volume;
              
              // Set voice if available
              if (get().settings.voice) {
                const matchingVoice = synth.getVoices().find(
                  v => v.voiceURI === get().settings.voice?.id
                );
                if (matchingVoice) {
                  utterance.voice = matchingVoice;
                }
              }
              
              // Set event handlers (simplified)
              utterance.onstart = () => {
                utterance.startTime = performance.now() - position;
                set({ isPlaying: true, isPaused: false });
                rafId = requestAnimationFrame(updateProgress);
              };
              
              // Start playing
              currentUtterance = utterance;
              synth.speak(utterance);
            }
          },
          
          // UI actions
          setPlayerMode: (mode) => {
            set({ playerMode: mode });
          },
          
          setVisibility: (visible) => {
            set({ isVisible: visible });
          },
          
          toggleVisibility: () => {
            set(state => ({ isVisible: !state.isVisible }));
          },
          
          // Settings actions
          updateSettings: (newSettings) => {
            set(state => ({
              settings: {
                ...state.settings,
                ...newSettings,
              }
            }));
          },
          
          setVoice: (voice) => {
            set(state => ({
              settings: {
                ...state.settings,
                voice,
              }
            }));
          },
          
          refreshVoices: async () => {
            try {
              const voices = await loadVoices();
              set({ availableVoices: voices });
              return voices;
            } catch (error) {
              set({ 
                error: error instanceof Error 
                  ? error 
                  : new Error('Failed to refresh voices')
              });
              return [];
            }
          },
        };
      },
      {
        name: 'tts-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist settings, not playback state
          settings: state.settings,
        }),
      }
    )
  );
}

// Create and export the store
export const useTtsStore = createTtsStore();

// Create a memoized selector to prevent unnecessary rerenders
const createSelector = <T extends (state: TtsState) => any>(selector: T) => {
  // Return a hook function
  return function useSelector() {
    // For SSR, return empty objects with noop functions
    if (typeof window === 'undefined') {
      return {} as ReturnType<T>;
    }
    
    // For client, use the normal selector with shallow comparison
    return useTtsStore(selector, shallow);
  };
};

// Export useful selectors
export const useTtsPlayback = createSelector((state) => ({
  isPlaying: state.isPlaying,
  isPaused: state.isPaused,
  progress: state.progress,
  duration: state.duration,
  currentPosition: state.currentPosition,
  playbackRate: state.playbackRate,
  play: state.play,
  playInMode: state.playInMode,
  pause: state.pause,
  resume: state.resume,
  stop: state.stop,
  seek: state.seek,
  setPlaybackRate: state.setPlaybackRate,
}));

export const useTtsPlayerMode = createSelector((state) => ({
  playerMode: state.playerMode,
  isVisible: state.isVisible,
  setPlayerMode: state.setPlayerMode,
  setVisibility: state.setVisibility,
  toggleVisibility: state.toggleVisibility,
}));

export const useTtsSettings = createSelector((state) => ({
  settings: state.settings,
  availableVoices: state.availableVoices,
  updateSettings: state.updateSettings,
  setVoice: state.setVoice,
  refreshVoices: state.refreshVoices,
}));

export const useTtsArticle = createSelector((state) => ({
  currentText: state.currentText,
  currentArticle: state.currentArticle,
}));

export const useTtsState = createSelector((state) => ({
  isInitialized: state.isInitialized,
  error: state.error,
  initialize: state.initialize,
  cleanup: state.cleanup,
}));

// Export default
export default useTtsStore;