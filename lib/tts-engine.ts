/**
 * Text-to-Speech Engine - A framework-agnostic service for TTS functionality
 * 
 * This module provides a clean, abstracted interface for TTS operations,
 * supporting multiple TTS providers through an adapter pattern.
 */

// Types and interfaces
export type TtsEventType = 
  | 'start' 
  | 'end' 
  | 'pause' 
  | 'resume' 
  | 'boundary' 
  | 'mark' 
  | 'error' 
  | 'progress'
  | 'voice-changed';

export type TtsEvent = {
  type: TtsEventType;
  timestamp: number;
  data?: any;
};

export type TtsBoundaryEvent = TtsEvent & {
  type: 'boundary';
  data: {
    name: 'word' | 'sentence' | 'paragraph';
    charIndex: number;
    charLength: number;
    text: string;
  };
};

export type TtsProgressEvent = TtsEvent & {
  type: 'progress';
  data: {
    position: number;
    duration: number;
    progress: number;
  };
};

export type TtsErrorEvent = TtsEvent & {
  type: 'error';
  data: {
    code: string;
    message: string;
    isFatal: boolean;
    originalError?: Error;
  };
};

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  isDefault?: boolean;
  provider: string;
  localService?: boolean;
}

export interface TtsOptions {
  voice?: TtsVoice | string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  provider?: string;
}

export interface TtsState {
  isInitialized: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  progress: number;
  position: number;
  duration: number;
  text: string;
  voice: TtsVoice | null;
  rate: number;
  pitch: number;
  volume: number;
}

export type TtsEventListener = (event: TtsEvent) => void;

/**
 * Interface for TTS provider adapters
 */
export interface ITtsProvider {
  readonly id: string;
  readonly name: string;
  readonly isAvailable: boolean;
  
  initialize(): Promise<boolean>;
  getVoices(): Promise<TtsVoice[]>;
  speak(text: string, options?: TtsOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  
  addEventListener(eventType: TtsEventType, listener: TtsEventListener): void;
  removeEventListener(eventType: TtsEventType, listener: TtsEventListener): void;
}

/**
 * Abstract base class for TTS providers
 */
export abstract class BaseTtsProvider implements ITtsProvider {
  protected eventListeners: Map<TtsEventType, Set<TtsEventListener>> = new Map();
  
  abstract readonly id: string;
  abstract readonly name: string;
  abstract get isAvailable(): boolean;
  
  abstract initialize(): Promise<boolean>;
  abstract getVoices(): Promise<TtsVoice[]>;
  abstract speak(text: string, options?: TtsOptions): Promise<void>;
  abstract pause(): void;
  abstract resume(): void;
  abstract stop(): void;
  
  addEventListener(eventType: TtsEventType, listener: TtsEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(listener);
  }
  
  removeEventListener(eventType: TtsEventType, listener: TtsEventListener): void {
    this.eventListeners.get(eventType)?.delete(listener);
    if (this.eventListeners.get(eventType)?.size === 0) {
      this.eventListeners.delete(eventType);
    }
  }
  
  protected dispatchEvent(event: TtsEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in TTS event listener for ${event.type}:`, error);
        }
      });
    }
  }
}

/**
 * Web Speech API provider implementation
 */
export class WebSpeechTtsProvider extends BaseTtsProvider {
  private static instance: WebSpeechTtsProvider | null = null;
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _isInitialized = false;
  private _voices: TtsVoice[] = [];
  private _rafId: number | null = null;
  private _startTime: number = 0;
  private _duration: number = 0;
  private _lastProgressUpdate: number = 0;
  private _progressUpdateInterval: number = 50; // ms
  
  readonly id = 'web-speech';
  readonly name = 'Web Speech API';
  
  private constructor() {
    super();
    // Private constructor for singleton pattern
  }
  
  public static getInstance(): WebSpeechTtsProvider {
    if (!WebSpeechTtsProvider.instance) {
      WebSpeechTtsProvider.instance = new WebSpeechTtsProvider();
    }
    return WebSpeechTtsProvider.instance;
  }
  
  get isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'speechSynthesis' in window && 
           'SpeechSynthesisUtterance' in window;
  }
  
  /**
   * Initialize the provider, loading voices if available
   */
  async initialize(): Promise<boolean> {
    if (!this.isAvailable) {
      this.dispatchEvent({
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'NOT_SUPPORTED',
          message: 'Web Speech API is not supported in this browser',
          isFatal: true
        }
      } as TtsErrorEvent);
      return false;
    }
    
    try {
      await this.loadVoices();
      this._isInitialized = true;
      return true;
    } catch (error) {
      this.dispatchEvent({
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'INITIALIZATION_FAILED',
          message: 'Failed to initialize Web Speech API',
          isFatal: true,
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      } as TtsErrorEvent);
      return false;
    }
  }
  
  /**
   * Get available voices from the Web Speech API
   */
  async getVoices(): Promise<TtsVoice[]> {
    if (!this._isInitialized) {
      await this.initialize();
    }
    return this._voices;
  }
  
  /**
   * Start speaking the provided text
   */
  async speak(text: string, options: TtsOptions = {}): Promise<void> {
    if (!this.isAvailable || !text) {
      return;
    }
    
    // Stop any current speech
    this.stop();
    
    try {
      if (!this._isInitialized) {
        await this.initialize();
      }
      
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice if provided
      if (options.voice) {
        const voices = await this.getVoices();
        
        // Handle voice as string (id) or object
        const voiceId = typeof options.voice === 'string' 
          ? options.voice 
          : options.voice.id;
        
        const voice = voices.find(v => v.id === voiceId);
        if (voice) {
          // Find matching browser voice
          const browserVoice = window.speechSynthesis.getVoices()
            .find(v => v.voiceURI === voice.id);
          
          if (browserVoice) {
            utterance.voice = browserVoice;
          }
        }
      }
      
      // Set other options
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.pitch !== undefined) utterance.pitch = options.pitch;
      if (options.volume !== undefined) utterance.volume = options.volume;
      if (options.lang) utterance.lang = options.lang;
      
      // Store for later use (e.g., to cancel)
      this._utterance = utterance;
      
      // Setup event handlers
      this.setupUtteranceEvents(utterance);
      
      // Calculate estimated duration (for progress tracking)
      this._duration = this.estimateDuration(text, utterance.rate);
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      
      // Start progress tracking
      this._startTime = performance.now();
      this.startProgressTracking();
      
    } catch (error) {
      this.dispatchEvent({
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'SPEAK_FAILED',
          message: 'Failed to start speech',
          isFatal: false,
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      } as TtsErrorEvent);
    }
  }
  
  /**
   * Pause the current speech
   */
  pause(): void {
    if (this.isAvailable && this._utterance) {
      window.speechSynthesis.pause();
      
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      this.dispatchEvent({
        type: 'pause',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.isAvailable && this._utterance) {
      window.speechSynthesis.resume();
      
      this.startProgressTracking();
      
      this.dispatchEvent({
        type: 'resume',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Stop all speech and clean up resources
   */
  stop(): void {
    if (this.isAvailable) {
      window.speechSynthesis.cancel();
      
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      if (this._utterance) {
        // Remove all event listeners
        this._utterance.onstart = null;
        this._utterance.onend = null;
        this._utterance.onpause = null;
        this._utterance.onresume = null;
        this._utterance.onerror = null;
        this._utterance.onboundary = null;
        this._utterance = null;
      }
      
      this.dispatchEvent({
        type: 'end',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Get the current state of the TTS engine
   */
  getState(): TtsState {
    const synth = window.speechSynthesis;
    
    return {
      isInitialized: this._isInitialized,
      isPlaying: synth ? !synth.paused && synth.speaking : false,
      isPaused: synth ? synth.paused && synth.speaking : false,
      isSpeaking: synth ? synth.speaking : false,
      progress: this.calculateProgress(),
      position: performance.now() - this._startTime,
      duration: this._duration,
      text: this._utterance?.text || '',
      voice: this._voices.find(v => 
        v.id === (this._utterance?.voice?.voiceURI || '')) || null,
      rate: this._utterance?.rate || 1,
      pitch: this._utterance?.pitch || 1,
      volume: this._utterance?.volume || 1
    };
  }
  
  /**
   * Set a new speaking rate
   */
  setRate(rate: number): void {
    if (this._utterance) {
      // Web Speech API doesn't support changing rate mid-speech
      // We would need to stop and restart with the new rate
      const currentText = this._utterance.text;
      const isSpeaking = window.speechSynthesis.speaking && !window.speechSynthesis.paused;
      
      this.stop();
      
      if (isSpeaking && currentText) {
        this.speak(currentText, { rate });
      }
    }
  }
  
  // Private helper methods
  
  /**
   * Load available voices from the Web Speech API
   */
  private async loadVoices(): Promise<TtsVoice[]> {
    return new Promise((resolve, reject) => {
      // Helper to convert browser voices to our format
      const processBrowserVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        this._voices = voices.map(voice => ({
          id: voice.voiceURI,
          name: voice.name,
          lang: voice.lang,
          gender: this.inferGender(voice.name),
          isDefault: voice.default,
          provider: this.id,
          localService: voice.localService
        }));
        resolve(this._voices);
      };
      
      // If voices are available immediately
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        processBrowserVoices();
        return;
      }
      
      // Otherwise wait for the voiceschanged event
      const voicesChangedHandler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        processBrowserVoices();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Set a timeout in case the event never fires
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        // Try one more time
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          processBrowserVoices();
        } else {
          // If still no voices, resolve with empty array
          this._voices = [];
          resolve([]);
        }
      }, 1000);
    });
  }
  
  /**
   * Setup event handlers for the utterance
   */
  private setupUtteranceEvents(utterance: SpeechSynthesisUtterance): void {
    utterance.onstart = (event) => {
      this.dispatchEvent({
        type: 'start',
        timestamp: Date.now()
      });
    };
    
    utterance.onend = (event) => {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      this.dispatchEvent({
        type: 'end',
        timestamp: Date.now()
      });
      
      // Clean up
      this._utterance = null;
    };
    
    utterance.onpause = (event) => {
      this.dispatchEvent({
        type: 'pause',
        timestamp: Date.now()
      });
    };
    
    utterance.onresume = (event) => {
      this.dispatchEvent({
        type: 'resume',
        timestamp: Date.now()
      });
    };
    
    utterance.onerror = (event) => {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      this.dispatchEvent({
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'SPEECH_ERROR',
          message: event.error || 'Unknown speech synthesis error',
          isFatal: true
        }
      } as TtsErrorEvent);
    };
    
    utterance.onboundary = (event) => {
      // Convert browser event to our format
      this.dispatchEvent({
        type: 'boundary',
        timestamp: Date.now(),
        data: {
          name: event.name as any, // 'word', 'sentence', etc.
          charIndex: event.charIndex,
          charLength: event.charLength || 0,
          text: utterance.text.substring(
            event.charIndex, 
            event.charIndex + (event.charLength || 0)
          )
        }
      } as TtsBoundaryEvent);
    };
  }
  
  /**
   * Start tracking progress with requestAnimationFrame
   */
  private startProgressTracking(): void {
    const updateProgress = () => {
      const now = performance.now();
      
      // Throttle updates to reduce jitter
      if (now - this._lastProgressUpdate >= this._progressUpdateInterval) {
        this._lastProgressUpdate = now;
        
        const progress = this.calculateProgress();
        const position = now - this._startTime;
        
        this.dispatchEvent({
          type: 'progress',
          timestamp: now,
          data: {
            position,
            duration: this._duration,
            progress
          }
        } as TtsProgressEvent);
      }
      
      // Continue if still speaking
      if (window.speechSynthesis.speaking) {
        this._rafId = requestAnimationFrame(updateProgress);
      } else {
        this._rafId = null;
      }
    };
    
    // Start the RAF loop
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(updateProgress);
    }
  }
  
  /**
   * Calculate current progress (0-100)
   */
  private calculateProgress(): number {
    if (!this._duration) return 0;
    
    const elapsed = performance.now() - this._startTime;
    return Math.min(100, (elapsed / this._duration) * 100);
  }
  
  /**
   * Estimate duration based on text length and rate
   * This is an approximation since the actual duration depends on many factors
   */
  private estimateDuration(text: string, rate: number = 1): number {
    // Average speaking rate is about 150 words per minute
    const wordsPerMinute = 150 * rate;
    const wordCount = text.split(/\s+/).length;
    const minutes = wordCount / wordsPerMinute;
    return minutes * 60 * 1000; // Convert to milliseconds
  }
  
  /**
   * Try to infer voice gender from name
   * This is a heuristic and not reliable across all languages
   */
  private inferGender(voiceName: string): 'male' | 'female' | 'neutral' {
    voiceName = voiceName.toLowerCase();
    
    // Common indicators in voice names
    if (
      voiceName.includes('male') || 
      voiceName.includes('man') || 
      voiceName.includes('guy') ||
      // Some common male voice names
      voiceName.includes('david') ||
      voiceName.includes('thomas') ||
      voiceName.includes('john') ||
      voiceName.includes('james')
    ) {
      return 'male';
    }
    
    if (
      voiceName.includes('female') || 
      voiceName.includes('woman') ||
      voiceName.includes('girl') ||
      // Some common female voice names
      voiceName.includes('samantha') ||
      voiceName.includes('victoria') ||
      voiceName.includes('karen') ||
      voiceName.includes('lisa')
    ) {
      return 'female';
    }
    
    // Default to neutral if we can't determine
    return 'neutral';
  }
}

/**
 * Main TTS Engine class - Manages TTS providers and provides a unified API
 */
export class TtsEngine {
  private static instance: TtsEngine | null = null;
  private providers: Map<string, ITtsProvider> = new Map();
  private activeProvider: ITtsProvider | null = null;
  private eventHandlers: Map<TtsEventType, Set<TtsEventListener>> = new Map();
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TtsEngine {
    if (!TtsEngine.instance) {
      TtsEngine.instance = new TtsEngine();
    }
    return TtsEngine.instance;
  }
  
  /**
   * Initialize the TTS engine with available providers
   */
  async initialize(): Promise<boolean> {
    try {
      // Add Web Speech provider by default if available
      const webSpeechProvider = WebSpeechTtsProvider.getInstance();
      this.registerProvider(webSpeechProvider);
      
      // Initialize at least one provider
      let anyInitialized = false;
      for (const provider of this.providers.values()) {
        const initialized = await provider.initialize();
        if (initialized) {
          anyInitialized = true;
          if (!this.activeProvider) {
            this.activeProvider = provider;
          }
        }
      }
      
      return anyInitialized;
    } catch (error) {
      this.dispatchErrorEvent({
        code: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize TTS engine',
        isFatal: true,
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }
  
  /**
   * Register a new TTS provider
   */
  registerProvider(provider: ITtsProvider): void {
    this.providers.set(provider.id, provider);
    
    // Add event forwarding
    SUPPORTED_EVENTS.forEach(eventType => {
      provider.addEventListener(eventType, (event) => {
        this.dispatchEvent(event);
      });
    });
  }
  
  /**
   * Set the active provider by ID
   */
  async setActiveProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      this.dispatchErrorEvent({
        code: 'PROVIDER_NOT_FOUND',
        message: `Provider '${providerId}' not found`,
        isFatal: false
      });
      return false;
    }
    
    if (!provider.isAvailable) {
      this.dispatchErrorEvent({
        code: 'PROVIDER_NOT_AVAILABLE',
        message: `Provider '${providerId}' is not available`,
        isFatal: false
      });
      return false;
    }
    
    // Initialize if needed
    if (!(await provider.initialize())) {
      return false;
    }
    
    // Stop current speech if any
    if (this.activeProvider) {
      this.activeProvider.stop();
    }
    
    this.activeProvider = provider;
    return true;
  }
  
  /**
   * Get all available providers
   */
  getProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isAvailable)
      .map(provider => ({
        id: provider.id,
        name: provider.name
      }));
  }
  
  /**
   * Get all available voices across all providers or for a specific provider
   */
  async getVoices(providerId?: string): Promise<TtsVoice[]> {
    if (providerId) {
      const provider = this.providers.get(providerId);
      if (!provider || !provider.isAvailable) {
        return [];
      }
      return provider.getVoices();
    }
    
    // Get voices from all providers
    const voicesPromises = Array.from(this.providers.values())
      .filter(provider => provider.isAvailable)
      .map(provider => provider.getVoices());
    
    const voicesByProvider = await Promise.all(voicesPromises);
    return voicesByProvider.flat();
  }
  
  /**
   * Speak the provided text using the active provider
   */
  async speak(text: string, options: TtsOptions = {}): Promise<void> {
    if (!text || !text.trim()) {
      return;
    }
    
    try {
      // If provider specified in options, use it
      if (options.provider && options.provider !== this.activeProvider?.id) {
        await this.setActiveProvider(options.provider);
      }
      
      // Ensure we have an active provider
      if (!this.activeProvider) {
        const availableProviders = Array.from(this.providers.values())
          .filter(p => p.isAvailable);
        
        if (availableProviders.length === 0) {
          throw new Error('No TTS providers available');
        }
        
        this.activeProvider = availableProviders[0];
        await this.activeProvider.initialize();
      }
      
      // Speak using the active provider
      await this.activeProvider.speak(text, options);
    } catch (error) {
      this.dispatchErrorEvent({
        code: 'SPEAK_FAILED',
        message: 'Failed to speak text',
        isFatal: false,
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }
  
  /**
   * Pause the current speech
   */
  pause(): void {
    this.activeProvider?.pause();
  }
  
  /**
   * Resume paused speech
   */
  resume(): void {
    this.activeProvider?.resume();
  }
  
  /**
   * Stop all speech
   */
  stop(): void {
    this.activeProvider?.stop();
  }
  
  /**
   * Add event listener
   */
  addEventListener(eventType: TtsEventType, listener: TtsEventListener): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(listener);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(eventType: TtsEventType, listener: TtsEventListener): void {
    this.eventHandlers.get(eventType)?.delete(listener);
    if (this.eventHandlers.get(eventType)?.size === 0) {
      this.eventHandlers.delete(eventType);
    }
  }
  
  /**
   * Estimate the duration of a text
   */
  getEstimatedDuration(text?: string, rate: number = 1): number {
    if (!text) return 0;
    
    // Average speaking rate is about 150 words per minute
    const wordsPerMinute = 150 * rate;
    const wordCount = text.split(/\s+/).length;
    const minutes = wordCount / wordsPerMinute;
    return minutes * 60 * 1000; // Convert to milliseconds
  }
  
  /**
   * Get the current state from the active provider
   */
  get state(): TtsState {
    if (!this.activeProvider) {
      return {
        isInitialized: false,
        isPlaying: false,
        isPaused: false,
        isSpeaking: false,
        progress: 0,
        position: 0,
        duration: 0,
        text: '',
        voice: null,
        rate: 1,
        pitch: 1,
        volume: 1
      };
    }
    
    // If we have the WebSpeech provider, we can get detailed state
    if (this.activeProvider instanceof WebSpeechTtsProvider) {
      return this.activeProvider.getState();
    }
    
    // Generic state for other providers (less detailed)
    return {
      isInitialized: true,
      isPlaying: false, // We don't know for sure with generic providers
      isPaused: false,
      isSpeaking: false,
      progress: 0,
      position: 0,
      duration: 0,
      text: '',
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1
    };
  }
  
  // Private methods
  
  private dispatchEvent(event: TtsEvent): void {
    const listeners = this.eventHandlers.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in TTS event listener for ${event.type}:`, error);
        }
      });
    }
  }
  
  private dispatchErrorEvent(errorData: Omit<TtsErrorEvent['data'], 'originalError'> & { originalError?: Error }): void {
    this.dispatchEvent({
      type: 'error',
      timestamp: Date.now(),
      data: errorData
    } as TtsErrorEvent);
  }
}

// Constants
const SUPPORTED_EVENTS: TtsEventType[] = [
  'start', 'end', 'pause', 'resume', 'boundary', 'mark', 'error', 'progress', 'voice-changed'
];

// Singleton instance
export const ttsEngine = TtsEngine.getInstance();

// Helper to convert TTS engine to audio player info
// This adapter is used to bridge the TTS engine to audio player components
interface AudioInfo {
  id: string;
  title: string;
  source: string;
  image: string;
  audioUrl: string;
  duration: number;
  isTTS: boolean;
  ttsEngine: TtsEngine;
}

/**
 * Create an audio player adapter for the TTS engine
 * This converts the TTS engine to a format compatible with audio player components
 */
export function createTtsAudioAdapter(
  id: string,
  title: string,
  source: string,
  image: string = '/placeholder-rss.svg'
): AudioInfo {
  return {
    id,
    title,
    source,
    image,
    audioUrl: '', // Not used for TTS
    isTTS: true,
    duration: ttsEngine.getEstimatedDuration(''), // Will be updated when speaking
    ttsEngine
  };
}

export default ttsEngine;