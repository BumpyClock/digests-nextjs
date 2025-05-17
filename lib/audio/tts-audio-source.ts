/**
 * TTS Audio Source Implementation
 * 
 * This module provides a Web Speech API implementation of the AudioSource interface
 * for text-to-speech functionality.
 */

import { 
  AudioSource, 
  BaseAudioSource, 
  AudioMetadata, 
  AudioPlayOptions
} from './audio-source';

/**
 * TTS-specific options
 */
export interface TtsOptions extends AudioPlayOptions {
  voice?: SpeechSynthesisVoice | string;
  pitch?: number;
  lang?: string;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

/**
 * Voice information interface
 */
export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  isDefault?: boolean;
  localService?: boolean;
}

/**
 * Implementation of AudioSource for Web Speech API
 */
export class TtsAudioSource extends BaseAudioSource implements AudioSource {
  readonly type: 'tts' = 'tts';
  readonly contentText: string;
  
  // Web Speech API specific
  private _speechSynth: SpeechSynthesis | null = null;
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _voices: SpeechSynthesisVoice[] = [];
  private _selectedVoice: SpeechSynthesisVoice | null = null;
  private _pitch: number = 1;
  private _lang: string = 'en-US';
  
  // Progress tracking
  private _startTime: number = 0;
  private _rafId: number | null = null;
  private _progressUpdateInterval: number = 50; // ms
  private _lastProgressUpdate: number = 0;
  
  // Text chunking for better seeking
  private _textChunks: {start: number, end: number, text: string}[] = [];
  private _currentChunkIndex: number = -1;
  
  // Event handlers storage for cleanup
  private _visibilityChangeHandler: (() => void) | null = null;
  private _beforeUnloadHandler: (() => void) | null = null;
  private _unloadHandler: (() => void) | null = null;
  
  constructor(id: string, text: string, metadata: AudioMetadata) {
    super(id, metadata);
    this.contentText = text;
    
    // Set duration based on text length (rough estimate)
    this._duration = this.estimateDuration(text);
  }
  
  /**
   * Initialize the TTS engine and load available voices
   */
  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.dispatchErrorEvent(
        'ENVIRONMENT_ERROR',
        'TTS is not available in server environment',
        false
      );
      return false;
    }
    
    // Check if speech synthesis is available
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      this.dispatchErrorEvent(
        'NOT_SUPPORTED',
        'Web Speech API is not supported in this browser',
        false
      );
      return false;
    }
    
    try {
      this._speechSynth = window.speechSynthesis;
      
      // Set up visibility change handler for Web Speech API
      // (this is particularly important as speechSynthesis can continue
      // even when page loses focus)
      this._visibilityChangeHandler = () => {
        if (document.visibilityState === 'hidden' && this._isPlaying) {
          console.log('Visibility changed: pausing TTS');
          this.pause();
        }
      };
      
      // Set up page unload handlers
      this._beforeUnloadHandler = () => {
        if (this._isPlaying || this._isPaused) {
          console.log('Page before unload: stopping TTS');
          this.stop();
        }
      };
      
      this._unloadHandler = () => {
        if (this._isPlaying || this._isPaused) {
          console.log('Page unloading: stopping TTS');
          this.stop();
        }
      };
      
      // Add event listeners
      document.addEventListener('visibilitychange', this._visibilityChangeHandler);
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
      window.addEventListener('unload', this._unloadHandler);
      
      // Load available voices
      await this.loadVoices();
      
      // Prepare text chunks for seeking
      this.prepareTextChunks();
      
      this._isInitialized = true;
      return true;
    } catch (error) {
      this.dispatchErrorEvent(
        'INITIALIZATION_FAILED',
        'Failed to initialize TTS engine',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }
  
  /**
   * Load text content for TTS
   */
  async load(options?: TtsOptions): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }
    
    if (options) {
      // Apply options
      if (options.voice) {
        await this.setVoice(options.voice);
      }
      
      if (options.pitch !== undefined) {
        this._pitch = options.pitch;
      }
      
      if (options.lang) {
        this._lang = options.lang;
      }
      
      if (options.rate !== undefined) {
        this._playbackRate = options.rate;
      }
      
      if (options.volume !== undefined) {
        this._volume = options.volume;
      }
    }
    
    // Prepare text chunks for seeking
    this.prepareTextChunks();
    
    // Update duration estimate based on text and rate
    this._duration = this.estimateDuration(this.contentText, this._playbackRate);
    
    // Dispatch loaded event
    this.dispatchEvent({
      type: 'loaded',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Start or resume TTS playback
   */
  async play(options?: TtsOptions): Promise<void> {
    if (!this._isInitialized || !this._speechSynth) {
      await this.initialize();
    }
    
    if (!this._speechSynth) {
      this.dispatchErrorEvent(
        'NOT_INITIALIZED',
        'TTS engine is not initialized',
        true
      );
      return;
    }
    
    // If already playing, stop current playback
    if (this._isPlaying) {
      this.stop();
    }
    
    try {
      // Set loading state
      this._isLoading = true;
      this.dispatchEvent({
        type: 'loading',
        timestamp: Date.now(),
        source: this
      });
      
      let text = this.contentText;
      let startPosition = 0;
      
      // Handle start time if provided
      if (options?.startTime && options.startTime > 0) {
        // Find appropriate chunk for seeking
        const seekChunk = this.findChunkAtTime(options.startTime);
        if (seekChunk) {
          text = this.contentText.substring(seekChunk.start);
          startPosition = options.startTime;
          this._currentTime = options.startTime;
        }
      }
      
      // Create utterance with text
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set properties
      if (this._selectedVoice) {
        utterance.voice = this._selectedVoice;
      }
      
      utterance.rate = options?.rate ?? this._playbackRate;
      utterance.pitch = options?.pitch ?? this._pitch;
      utterance.volume = options?.volume ?? this._volume;
      utterance.lang = options?.lang ?? this._lang;
      
      // Setup event handlers
      this.setupUtteranceEvents(utterance, startPosition);
      
      // Start speaking
      this._utterance = utterance;
      this._speechSynth.speak(utterance);
      
      // Clear loading state
      this._isLoading = false;
      
      // Update state
      this._isPlaying = true;
      this._isPaused = false;
      this._isStopped = false;
      
      // Start progress tracking
      this._startTime = performance.now() - startPosition * 1000; // Adjust for seeking
      this.startProgressTracking();
      
      // Dispatch play event
      this.dispatchEvent({
        type: 'play',
        timestamp: Date.now(),
        source: this
      });
      
    } catch (error) {
      this._isLoading = false;
      this.dispatchErrorEvent(
        'PLAYBACK_ERROR',
        'Failed to start TTS playback',
        true,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  /**
   * Pause TTS playback
   */
  pause(): void {
    if (!this._speechSynth || !this._isPlaying || this._isPaused) {
      return;
    }
    
    this._speechSynth.pause();
    this._isPaused = true;
    this._isPlaying = false;
    
    // Stop progress tracking
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    
    // Dispatch pause event
    this.dispatchEvent({
      type: 'pause',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Resume paused TTS playback
   */
  resume(): void {
    if (!this._speechSynth || !this._isPaused) {
      return;
    }
    
    // Speech synthesis has a bug in some browsers where resume() doesn't work
    // properly after a long pause. To work around it, we'll restart with a
    // calculated offset if needed.
    const currentTime = Date.now();
    const pauseTime = currentTime - this._lastProgressUpdate;
    
    // If paused for too long (more than 5 seconds), restart with seek
    if (pauseTime > 5000 && this._currentTime > 0) {
      const seekTime = this._currentTime;
      this.stop();
      this.play({ startTime: seekTime });
      return;
    }
    
    // Normal resume for short pauses
    this._speechSynth.resume();
    this._isPaused = false;
    this._isPlaying = true;
    
    // Resume progress tracking
    this.startProgressTracking();
    
    // Dispatch resume event
    this.dispatchEvent({
      type: 'resume',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Stop TTS playback
   */
  stop(): void {
    if (!this._speechSynth) {
      return;
    }
    
    // Cancel any pending speech
    this._speechSynth.cancel();
    
    // Stop progress tracking
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    
    // Clean up utterance events
    if (this._utterance) {
      this._utterance.onstart = null;
      this._utterance.onend = null;
      this._utterance.onpause = null;
      this._utterance.onresume = null;
      this._utterance.onerror = null;
      this._utterance.onboundary = null;
      this._utterance = null;
    }
    
    // Reset state
    this._isPlaying = false;
    this._isPaused = false;
    this._isStopped = true;
    this._currentTime = 0;
    this._currentChunkIndex = -1;
    
    // Dispatch stop event
    this.dispatchEvent({
      type: 'stop',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Seek to a position in the TTS content
   */
  seek(time: number): void {
    if (!this._isInitialized || time < 0 || time > this._duration) {
      return;
    }
    
    const wasPlaying = this._isPlaying;
    
    // Stop current playback
    this.stop();
    
    // If we were playing, restart from new position
    if (wasPlaying) {
      this.play({ startTime: time });
    } else {
      // Just update the current time
      this._currentTime = time;
      this.dispatchProgressEvent();
    }
  }
  
  /**
   * Set TTS playback volume
   */
  setVolume(volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    
    if (this._volume === volume) {
      return;
    }
    
    this._volume = volume;
    
    if (this._utterance) {
      this._utterance.volume = volume;
    }
    
    // Dispatch volume change event
    this.dispatchEvent({
      type: 'volumechange',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Set TTS playback rate
   */
  setPlaybackRate(rate: number): void {
    if (rate === this._playbackRate) {
      return;
    }
    
    // Store previous state
    const wasPlaying = this._isPlaying;
    const currentPosition = this._currentTime;
    
    // Stop current playback
    this.stop();
    
    // Update rate
    this._playbackRate = rate;
    
    // Update duration estimate with new rate
    this._duration = this.estimateDuration(this.contentText, rate);
    
    // Dispatch rate change event
    this.dispatchEvent({
      type: 'ratechange',
      timestamp: Date.now(),
      source: this
    });
    
    // If we were playing, restart with new rate
    if (wasPlaying) {
      this.play({ 
        startTime: currentPosition,
        rate: rate
      });
    }
  }
  
  /**
   * Set TTS voice
   */
  async setVoice(voice: SpeechSynthesisVoice | string): Promise<boolean> {
    if (!this._speechSynth) {
      return false;
    }
    
    try {
      // Ensure voices are loaded
      if (this._voices.length === 0) {
        await this.loadVoices();
      }
      
      // Find voice by object or ID
      let targetVoice: SpeechSynthesisVoice | null = null;
      
      if (typeof voice === 'string') {
        // Find by ID (voiceURI)
        targetVoice = this._voices.find(v => v.voiceURI === voice) || null;
      } else {
        // Direct voice object
        targetVoice = voice;
      }
      
      if (!targetVoice) {
        console.warn(`Voice not found: ${typeof voice === 'string' ? voice : voice.name}`);
        return false;
      }
      
      // Update selected voice
      this._selectedVoice = targetVoice;
      
      return true;
    } catch (error) {
      console.error('Error setting voice:', error);
      return false;
    }
  }
  
  /**
   * Get available TTS voices
   */
  async getVoices(): Promise<VoiceInfo[]> {
    if (!this._isInitialized) {
      await this.initialize();
    }
    
    if (this._voices.length === 0) {
      await this.loadVoices();
    }
    
    // Convert to VoiceInfo format
    return this._voices.map(v => ({
      id: v.voiceURI,
      name: v.name,
      lang: v.lang,
      gender: this.inferGender(v.name),
      isDefault: v.default,
      localService: v.localService
    }));
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    
    // Remove event listeners
    if (this._visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
      this._visibilityChangeHandler = null;
    }
    
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._beforeUnloadHandler = null;
    }
    
    if (this._unloadHandler) {
      window.removeEventListener('unload', this._unloadHandler);
      this._unloadHandler = null;
    }
    
    this._utterance = null;
    this._speechSynth = null;
    this._isInitialized = false;
    
    super.dispose();
  }
  
  // Private helper methods
  
  /**
   * Load available voices from the speech synthesis API
   */
  private async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this._speechSynth) {
      return [];
    }
    
    return new Promise((resolve) => {
      // Helper to process available voices
      const processVoices = () => {
        const voices = this._speechSynth!.getVoices();
        this._voices = voices;
        
        // Select default voice
        if (!this._selectedVoice && voices.length > 0) {
          // Prefer English voices
          const englishVoice = voices.find(v => 
            v.lang.startsWith('en-') && v.localService
          ) || voices.find(v => v.lang.startsWith('en-')) || voices[0];
          
          this._selectedVoice = englishVoice;
        }
        
        resolve(voices);
      };
      
      // If voices are already available, use them
      const voices = this._speechSynth.getVoices();
      if (voices.length > 0) {
        this._voices = voices;
        processVoices();
        return;
      }
      
      // Otherwise, wait for the voiceschanged event
      const voicesChangedHandler = () => {
        this._speechSynth!.removeEventListener('voiceschanged', voicesChangedHandler);
        processVoices();
      };
      
      this._speechSynth.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Set a timeout in case the event never fires
      setTimeout(() => {
        this._speechSynth!.removeEventListener('voiceschanged', voicesChangedHandler);
        
        // Try one more time
        const voices = this._speechSynth!.getVoices();
        if (voices.length > 0) {
          this._voices = voices;
          processVoices();
        } else {
          // If still no voices, resolve with empty array
          resolve([]);
        }
      }, 1000);
    });
  }
  
  /**
   * Set up event handlers for the speech utterance
   */
  private setupUtteranceEvents(utterance: SpeechSynthesisUtterance, startPosition: number = 0): void {
    utterance.onstart = () => {
      // Update state
      this._isPlaying = true;
      this._isPaused = false;
      this._isStopped = false;
      
      // Set start time for progress tracking
      this._startTime = performance.now() - startPosition * 1000;
      
      // Dispatch start event
      this.dispatchEvent({
        type: 'play',
        timestamp: Date.now(),
        source: this
      });
      
      // Start progress tracking
      this.startProgressTracking();
    };
    
    utterance.onend = () => {
      // Stop progress tracking
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      // Set final position
      this._currentTime = this._duration;
      
      // Update state
      this._isPlaying = false;
      this._isPaused = false;
      this._isStopped = true;
      
      // Dispatch end event
      this.dispatchEvent({
        type: 'end',
        timestamp: Date.now(),
        source: this
      });
      
      // Final progress update
      this.dispatchProgressEvent();
    };
    
    utterance.onpause = () => {
      this._isPlaying = false;
      this._isPaused = true;
      
      // Dispatch pause event
      this.dispatchEvent({
        type: 'pause',
        timestamp: Date.now(),
        source: this
      });
    };
    
    utterance.onresume = () => {
      this._isPlaying = true;
      this._isPaused = false;
      
      // Dispatch resume event
      this.dispatchEvent({
        type: 'resume',
        timestamp: Date.now(),
        source: this
      });
    };
    
    utterance.onerror = (event) => {
      // Log the error
      console.error('Speech synthesis error:', event);
      
      // Stop progress tracking
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      
      // Update state
      this._isPlaying = false;
      this._isPaused = false;
      this._isStopped = true;
      
      // Dispatch error event
      this.dispatchErrorEvent(
        'SPEECH_ERROR',
        event.error || 'Unknown speech synthesis error',
        false
      );
    };
    
    utterance.onboundary = (event) => {
      // Handle boundary events (word, sentence)
      if (event.name === 'word' || event.name === 'sentence') {
        // Find current chunk
        const charIndex = event.charIndex;
        const chunkIndex = this._textChunks.findIndex(
          chunk => charIndex >= chunk.start && charIndex <= chunk.end
        );
        
        if (chunkIndex !== -1 && chunkIndex !== this._currentChunkIndex) {
          this._currentChunkIndex = chunkIndex;
          // Additional boundary event handling could be added here
        }
      }
    };
  }
  
  /**
   * Start tracking progress with requestAnimationFrame
   */
  private startProgressTracking(): void {
    const updateProgress = () => {
      const now = performance.now();
      
      // Only update if enough time has passed (to avoid too frequent updates)
      if (now - this._lastProgressUpdate >= this._progressUpdateInterval) {
        this._lastProgressUpdate = now;
        
        // Calculate current position based on elapsed time
        const elapsed = now - this._startTime;
        this._currentTime = Math.min(this._duration, elapsed / 1000);
        
        // Dispatch progress event
        this.dispatchProgressEvent();
      }
      
      // Continue if still playing
      if (this._isPlaying) {
        this._rafId = requestAnimationFrame(updateProgress);
      } else {
        this._rafId = null;
      }
    };
    
    // Start the animation frame loop
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(updateProgress);
    }
  }
  
  /**
   * Prepare text chunks for better seeking
   */
  private prepareTextChunks(): void {
    // Reset chunks
    this._textChunks = [];
    
    if (!this.contentText) {
      return;
    }
    
    // Split text into sentences
    const sentences = this.contentText.split(/(?<=[.!?])\s+/);
    let currentIndex = 0;
    let estimatedDuration = 0;
    
    sentences.forEach(sentence => {
      const start = currentIndex;
      const end = start + sentence.length;
      
      // Calculate approximate duration for this sentence
      const sentenceDuration = this.estimateDuration(sentence, this._playbackRate);
      
      this._textChunks.push({
        start,
        end,
        text: sentence
      });
      
      currentIndex = end + 1; // +1 for space after sentence
      estimatedDuration += sentenceDuration;
    });
    
    // Update total duration
    this._duration = estimatedDuration;
  }
  
  /**
   * Find text chunk at a specific time position
   */
  private findChunkAtTime(timePosition: number): { start: number; end: number; text: string } | null {
    if (this._textChunks.length === 0) {
      return null;
    }
    
    let elapsed = 0;
    
    for (let i = 0; i < this._textChunks.length; i++) {
      const chunk = this._textChunks[i];
      const chunkDuration = this.estimateDuration(chunk.text, this._playbackRate);
      
      if (elapsed + chunkDuration > timePosition) {
        return chunk;
      }
      
      elapsed += chunkDuration;
    }
    
    // If we get here, we're past all chunks, so return the last one
    return this._textChunks[this._textChunks.length - 1];
  }
  
  /**
   * Estimate duration based on text length and rate
   */
  private estimateDuration(text: string, rate: number = 1): number {
    if (!text) return 0;
    
    // Average speaking rate is ~150 words per minute
    const wordsPerMinute = 150 * rate;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const minutes = wordCount / wordsPerMinute;
    
    return minutes * 60; // Convert to seconds
  }
  
  /**
   * Try to infer gender from voice name
   */
  private inferGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    
    // Common indicators in voice names
    if (
      name.includes('male') || 
      name.includes('man') || 
      name.includes('guy') ||
      name.includes('david') ||
      name.includes('thomas') ||
      name.includes('john') ||
      name.includes('james')
    ) {
      return 'male';
    }
    
    if (
      name.includes('female') || 
      name.includes('woman') ||
      name.includes('girl') ||
      name.includes('samantha') ||
      name.includes('victoria') ||
      name.includes('karen') ||
      name.includes('lisa')
    ) {
      return 'female';
    }
    
    return 'neutral';
  }
}