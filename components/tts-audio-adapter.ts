/**
 * TTS Audio Adapter
 * 
 * This adapter bridges between the TTS engine and audio player interfaces,
 * allowing TTS to be used with existing audio player components.
 */

import { 
  ttsEngine, 
  TtsEvent, 
  TtsProgressEvent, 
  TtsErrorEvent, 
  TtsOptions 
} from '@/lib/tts-engine';

// Types for integration with audio player
export interface AudioPlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (position: number) => void;
  setRate?: (rate: number) => void;
  
  // Optional callback for cleaning up resources
  onDispose?: (adapter: TtsAudioAdapter) => void;
}

export interface AudioInfo {
  id: string;
  title: string;
  source: string;
  image: string;
  audioUrl?: string;
  duration: number;
  isTTS: boolean;
}

// TTS Adapter event types
export type TtsAdapterEventType = 
  | 'play'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'ended'
  | 'progress'
  | 'error'
  | 'ratechange'
  | 'timeupdate';

export type TtsAdapterEvent = {
  type: TtsAdapterEventType;
  data?: any;
};

export type TtsAdapterEventListener = (event: TtsAdapterEvent) => void;

/**
 * TTS Audio Adapter class
 * 
 * This adapter makes the TTS engine compatible with audio player interfaces.
 * It translates TTS events to audio player events and vice versa.
 */
export class TtsAudioAdapter {
  private audioInfo: AudioInfo;
  private playerControls: AudioPlayerControls | null = null;
  private eventListeners: Map<TtsAdapterEventType, Set<TtsAdapterEventListener>> = new Map();
  
  // State
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _progress: number = 0;
  private _duration: number = 0;
  private _position: number = 0;
  private _rate: number = 1;
  private _text: string = '';
  
  // Keep track of TTS event listeners for cleanup
  private boundTtsEventHandlers: Map<string, (event: TtsEvent) => void> = new Map();
  
  /**
   * Create a new TTS Audio Adapter
   * 
   * @param audioInfo - Information about the audio (title, source, etc.)
   * @param text - The text to be spoken
   * @param options - TTS options (voice, rate, etc.)
   */
  constructor(
    audioInfo: AudioInfo,
    text: string = '',
    options: TtsOptions = {}
  ) {
    this.audioInfo = {
      ...audioInfo,
      isTTS: true
    };
    
    this._text = text;
    
    // Initialize TTS engine if needed
    this.initializeTts();
    
    // Estimate duration based on text length
    if (text) {
      this._duration = ttsEngine.getEstimatedDuration(text, options.rate || 1);
      this.audioInfo.duration = this._duration;
    }
    
    // Set up TTS event listeners
    this.setupTtsEventListeners();
  }
  
  /**
   * Register a player to control this adapter
   * 
   * @param controls - The player controls object
   */
  registerPlayerControls(controls: AudioPlayerControls): void {
    this.playerControls = controls;
  }
  
  /**
   * Play or resume TTS
   */
  play(): void {
    if (!this._text) return;
    
    if (this._isPaused) {
      this.resume();
      return;
    }
    
    ttsEngine.speak(this._text, {
      rate: this._rate
    });
    
    this._isPlaying = true;
    this._isPaused = false;
    
    this.dispatchEvent({
      type: 'play'
    });
  }
  
  /**
   * Pause TTS playback
   */
  pause(): void {
    ttsEngine.pause();
    
    this._isPlaying = false;
    this._isPaused = true;
    
    this.dispatchEvent({
      type: 'pause'
    });
  }
  
  /**
   * Resume paused TTS playback
   */
  resume(): void {
    ttsEngine.resume();
    
    this._isPlaying = true;
    this._isPaused = false;
    
    this.dispatchEvent({
      type: 'resume'
    });
  }
  
  /**
   * Stop TTS playback
   */
  stop(): void {
    ttsEngine.stop();
    
    this._isPlaying = false;
    this._isPaused = false;
    this._progress = 0;
    this._position = 0;
    
    this.dispatchEvent({
      type: 'stop'
    });
  }
  
  /**
   * Seek to a specific position
   * 
   * @param position - The position to seek to (in milliseconds)
   */
  seek(position: number): void {
    const targetPosition = Math.max(0, Math.min(position, this._duration));
    
    // Calculate the text to speak based on position
    // This is just an approximation since we don't have direct access
    // to the text position in the Web Speech API
    const seekRatio = targetPosition / this._duration;
    
    // If not playing, just update the position
    if (!this._isPlaying) {
      this._position = targetPosition;
      this._progress = seekRatio * 100;
      
      this.dispatchEvent({
        type: 'timeupdate',
        data: {
          currentTime: this._position / 1000, // Convert to seconds for audio player compatibility
          duration: this._duration / 1000
        }
      });
      
      return;
    }
    
    // Otherwise, stop and restart from new position
    const wasPlaying = this._isPlaying;
    const wasPaused = this._isPaused;
    
    // Stop current playback
    this.stop();
    
    // Calculate approximate character position
    const totalChars = this._text.length;
    const charPosition = Math.floor(totalChars * seekRatio);
    
    // Find the nearest sentence or paragraph start
    let startPos = 0;
    const sentences = this._text.split(/[.!?]+\s/);
    let charCount = 0;
    
    for (const sentence of sentences) {
      const nextCharCount = charCount + sentence.length + 2; // +2 for punctuation and space
      if (nextCharCount > charPosition) break;
      charCount = nextCharCount;
      startPos = charCount;
    }
    
    // Create new text starting from this position
    const remainingText = this._text.substring(startPos);
    
    // Update internal state
    this._position = targetPosition;
    this._progress = seekRatio * 100;
    
    // Send timeupdate event
    this.dispatchEvent({
      type: 'timeupdate',
      data: {
        currentTime: this._position / 1000, // Convert to seconds for audio player compatibility
        duration: this._duration / 1000
      }
    });
    
    // Restart playback if it was playing
    if (wasPlaying && !wasPaused) {
      ttsEngine.speak(remainingText, {
        rate: this._rate
      });
      
      this._isPlaying = true;
      this._isPaused = false;
      
      this.dispatchEvent({
        type: 'play'
      });
    }
  }
  
  /**
   * Set the playback rate
   * 
   * @param rate - The new playback rate (0.5 to 2.0)
   */
  setRate(rate: number): void {
    // Validate rate
    const validRate = Math.max(0.5, Math.min(rate, 2.0));
    
    if (validRate === this._rate) return;
    
    this._rate = validRate;
    
    // If currently playing, need to restart with new rate
    if (this._isPlaying) {
      const currentPosition = this._position;
      
      // Stop current playback
      this.stop();
      
      // Recalculate duration
      this._duration = ttsEngine.getEstimatedDuration(this._text, this._rate);
      this.audioInfo.duration = this._duration;
      
      // Restart from current position
      this.seek(currentPosition);
      
      // If it wasn't paused, resume
      if (!this._isPaused) {
        this.play();
      }
    } else {
      // Just update the duration
      this._duration = ttsEngine.getEstimatedDuration(this._text, this._rate);
      this.audioInfo.duration = this._duration;
    }
    
    // Dispatch rate change event
    this.dispatchEvent({
      type: 'ratechange',
      data: {
        rate: this._rate
      }
    });
  }
  
  /**
   * Set new text to speak
   * 
   * @param text - The new text to speak
   * @param playImmediately - Whether to start playing immediately
   */
  setText(text: string, playImmediately: boolean = false): void {
    // Stop current playback
    this.stop();
    
    this._text = text;
    this._duration = ttsEngine.getEstimatedDuration(text, this._rate);
    this.audioInfo.duration = this._duration;
    
    if (playImmediately) {
      this.play();
    }
  }
  
  /**
   * Update the audio info
   * 
   * @param info - New audio info
   */
  updateAudioInfo(info: Partial<AudioInfo>): void {
    this.audioInfo = {
      ...this.audioInfo,
      ...info,
      isTTS: true
    };
  }
  
  /**
   * Get current audio info
   */
  getAudioInfo(): AudioInfo {
    return {
      ...this.audioInfo,
      duration: this._duration
    };
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      isPlaying: this._isPlaying,
      isPaused: this._isPaused,
      progress: this._progress,
      duration: this._duration,
      position: this._position,
      rate: this._rate,
      text: this._text
    };
  }
  
  /**
   * Add event listener
   * 
   * @param eventType - The event type
   * @param listener - The event listener
   */
  addEventListener(eventType: TtsAdapterEventType, listener: TtsAdapterEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(listener);
  }
  
  /**
   * Remove event listener
   * 
   * @param eventType - The event type
   * @param listener - The event listener
   */
  removeEventListener(eventType: TtsAdapterEventType, listener: TtsAdapterEventListener): void {
    this.eventListeners.get(eventType)?.delete(listener);
    if (this.eventListeners.get(eventType)?.size === 0) {
      this.eventListeners.delete(eventType);
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop any playback
    this.stop();
    
    // Remove TTS event listeners
    this.boundTtsEventHandlers.forEach((handler, eventType) => {
      ttsEngine.removeEventListener(eventType as any, handler);
    });
    this.boundTtsEventHandlers.clear();
    
    // Clear local event listeners
    this.eventListeners.clear();
    
    // Notify player controls
    if (this.playerControls && this.playerControls.onDispose) {
      this.playerControls.onDispose(this);
    }
    
    this.playerControls = null;
  }
  
  // Private methods
  
  /**
   * Initialize TTS engine
   */
  private async initializeTts(): Promise<void> {
    try {
      await ttsEngine.initialize();
    } catch (error) {
      console.error('Failed to initialize TTS engine:', error);
      this.dispatchEvent({
        type: 'error',
        data: {
          message: 'Failed to initialize TTS engine'
        }
      });
    }
  }
  
  /**
   * Set up TTS event listeners
   */
  private setupTtsEventListeners(): void {
    // Create event handler for start
    const handleStart = (event: TtsEvent) => {
      this._isPlaying = true;
      this._isPaused = false;
      
      this.dispatchEvent({
        type: 'play'
      });
    };
    this.boundTtsEventHandlers.set('start', handleStart);
    ttsEngine.addEventListener('start', handleStart);
    
    // Create event handler for end
    const handleEnd = (event: TtsEvent) => {
      this._isPlaying = false;
      this._isPaused = false;
      this._progress = 100;
      this._position = this._duration;
      
      this.dispatchEvent({
        type: 'ended'
      });
    };
    this.boundTtsEventHandlers.set('end', handleEnd);
    ttsEngine.addEventListener('end', handleEnd);
    
    // Create event handler for pause
    const handlePause = (event: TtsEvent) => {
      this._isPlaying = false;
      this._isPaused = true;
      
      this.dispatchEvent({
        type: 'pause'
      });
    };
    this.boundTtsEventHandlers.set('pause', handlePause);
    ttsEngine.addEventListener('pause', handlePause);
    
    // Create event handler for resume
    const handleResume = (event: TtsEvent) => {
      this._isPlaying = true;
      this._isPaused = false;
      
      this.dispatchEvent({
        type: 'resume'
      });
    };
    this.boundTtsEventHandlers.set('resume', handleResume);
    ttsEngine.addEventListener('resume', handleResume);
    
    // Create event handler for progress
    const handleProgress = (event: TtsProgressEvent) => {
      this._progress = event.data.progress;
      this._position = event.data.position;
      this._duration = event.data.duration || this._duration;
      
      this.dispatchEvent({
        type: 'progress',
        data: {
          progress: this._progress
        }
      });
      
      this.dispatchEvent({
        type: 'timeupdate',
        data: {
          currentTime: this._position / 1000, // Convert to seconds for audio player compatibility
          duration: this._duration / 1000
        }
      });
    };
    this.boundTtsEventHandlers.set('progress', handleProgress);
    ttsEngine.addEventListener('progress', handleProgress);
    
    // Create event handler for error
    const handleError = (event: TtsErrorEvent) => {
      this.dispatchEvent({
        type: 'error',
        data: {
          message: event.data.message,
          code: event.data.code
        }
      });
    };
    this.boundTtsEventHandlers.set('error', handleError);
    ttsEngine.addEventListener('error', handleError);
  }
  
  /**
   * Dispatch event to listeners
   * 
   * @param event - The event to dispatch
   */
  private dispatchEvent(event: TtsAdapterEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in TTS adapter event listener for ${event.type}:`, error);
        }
      });
    }
  }
}

/**
 * Factory function to create a TTS audio adapter
 * 
 * @param id - Unique ID for the audio
 * @param title - Title of the content
 * @param source - Source of the content (e.g., article name)
 * @param text - Text to speak
 * @param options - TTS options
 * @param image - Optional image URL
 */
export function createTtsAudioAdapter(
  id: string,
  title: string,
  source: string,
  text: string,
  options: TtsOptions = {},
  image: string = '/placeholder-rss.svg'
): TtsAudioAdapter {
  const audioInfo: AudioInfo = {
    id,
    title,
    source,
    image,
    duration: 0, // Will be calculated in constructor
    isTTS: true
  };
  
  return new TtsAudioAdapter(audioInfo, text, options);
}

export default TtsAudioAdapter;