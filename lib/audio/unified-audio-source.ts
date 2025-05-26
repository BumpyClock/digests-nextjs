// ABOUTME: Simplified unified audio source that handles both podcast and TTS playback
// ABOUTME: Replaces the complex abstract factory pattern with a single class

"use client";

export type AudioSourceType = 'podcast' | 'tts';

export interface AudioMetadata {
  id: string;
  title: string;
  source: string;
  thumbnail?: string;
}

export interface UnifiedAudioSourceOptions {
  type: AudioSourceType;
  content: string; // URL for podcast, text for TTS
  metadata: AudioMetadata;
}

/**
 * Unified audio source that handles both podcast and TTS playback
 * Simplifies the previous abstract factory pattern
 */
export class UnifiedAudioSource {
  private type: AudioSourceType;
  private content: string;
  private metadata: AudioMetadata;
  
  // For podcast playback
  private audioElement?: HTMLAudioElement;
  
  // For TTS playback
  private utterance?: SpeechSynthesisUtterance;
  private synth?: SpeechSynthesis;
  
  // Common properties
  public duration: number = 0;
  public currentTime: number = 0;
  public volume: number = 1;
  public playbackRate: number = 1;
  
  // Event handlers
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  constructor(options: UnifiedAudioSourceOptions) {
    this.type = options.type;
    this.content = options.content;
    this.metadata = options.metadata;
  }
  
  async initialize(): Promise<void> {
    if (this.type === 'podcast') {
      this.audioElement = new Audio();
      this.audioElement.src = this.content;
      
      // Set up audio element event listeners
      this.audioElement.addEventListener('loadedmetadata', () => {
        this.duration = this.audioElement!.duration;
        this.emit('loaded');
      });
      
      this.audioElement.addEventListener('timeupdate', () => {
        this.currentTime = this.audioElement!.currentTime;
        const progress = this.duration > 0 ? this.currentTime / this.duration : 0;
        this.emit('progress', { currentTime: this.currentTime, duration: this.duration, progress });
      });
      
      this.audioElement.addEventListener('play', () => this.emit('play'));
      this.audioElement.addEventListener('pause', () => this.emit('pause'));
      this.audioElement.addEventListener('ended', () => this.emit('end'));
      this.audioElement.addEventListener('error', (e) => {
        this.emit('error', {
          code: 'AUDIO_ERROR',
          message: 'Failed to load audio',
          recoverable: true
        });
      });
      
    } else if (this.type === 'tts') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.utterance = new SpeechSynthesisUtterance(this.content);
        
        // Estimate duration for TTS (rough approximation)
        const words = this.content.split(/\s+/).length;
        const wordsPerMinute = 150; // Average speaking rate
        this.duration = (words / wordsPerMinute) * 60;
        
        // Set up TTS event listeners
        this.utterance.onstart = () => this.emit('play');
        this.utterance.onpause = () => this.emit('pause');
        this.utterance.onresume = () => this.emit('play');
        this.utterance.onend = () => {
          this.currentTime = this.duration;
          this.emit('end');
        };
        this.utterance.onerror = (event) => {
          this.emit('error', {
            code: 'TTS_ERROR',
            message: `TTS error: ${event.error}`,
            recoverable: true
          });
        };
      } else {
        throw new Error('TTS not supported');
      }
    }
  }
  
  async load(): Promise<void> {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.load();
      this.emit('loading');
    } else if (this.type === 'tts') {
      // TTS doesn't need loading
      this.emit('loaded');
    }
  }
  
  async play(options?: { startTime?: number }): Promise<void> {
    if (this.type === 'podcast' && this.audioElement) {
      if (options?.startTime !== undefined) {
        this.audioElement.currentTime = options.startTime;
      }
      await this.audioElement.play();
    } else if (this.type === 'tts' && this.synth && this.utterance) {
      this.synth.cancel(); // Cancel any ongoing speech
      this.utterance.volume = this.volume;
      this.utterance.rate = this.playbackRate;
      this.synth.speak(this.utterance);
    }
  }
  
  pause(): void {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.pause();
    } else if (this.type === 'tts' && this.synth) {
      this.synth.pause();
    }
  }
  
  resume(): void {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.play();
    } else if (this.type === 'tts' && this.synth) {
      this.synth.resume();
    }
  }
  
  stop(): void {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    } else if (this.type === 'tts' && this.synth) {
      this.synth.cancel();
    }
    this.emit('stop');
  }
  
  seek(time: number): void {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.duration));
    }
    // Note: Seeking is not supported for TTS
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.volume = this.volume;
    } else if (this.type === 'tts' && this.utterance) {
      this.utterance.volume = this.volume;
    }
  }
  
  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.playbackRate = rate;
    } else if (this.type === 'tts' && this.utterance) {
      this.utterance.rate = rate;
    }
  }
  
  dispose(): void {
    if (this.type === 'podcast' && this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = undefined;
    } else if (this.type === 'tts' && this.synth) {
      this.synth.cancel();
      this.utterance = undefined;
    }
    this.eventHandlers.clear();
  }
  
  // Event emitter methods
  addEventListener(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  removeEventListener(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler({ type: event, ...data }));
    }
  }
}

/**
 * Simple factory function to create audio sources
 */
export function createAudioSource(type: AudioSourceType, content: string, metadata: AudioMetadata): UnifiedAudioSource {
  return new UnifiedAudioSource({ type, content, metadata });
}