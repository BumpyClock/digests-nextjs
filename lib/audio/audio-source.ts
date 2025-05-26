/**
 * Audio System - Core interfaces and types
 * 
 * This module defines the foundation for a unified audio system that supports
 * both TTS (Text-to-Speech) and regular audio playback (podcasts, etc.)
 */

/**
 * Audio event types that can be emitted by an audio source
 */
export type AudioEventType = 
  | 'play'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'end'
  | 'error'
  | 'progress'
  | 'loading'
  | 'loaded'
  | 'ratechange'
  | 'volumechange';

/**
 * Base audio event interface
 */
export interface AudioEvent {
  type: AudioEventType;
  timestamp: number;
  source: AudioSource;
}

/**
 * Progress update event
 */
export interface ProgressEvent extends AudioEvent {
  type: 'progress';
  currentTime: number;
  duration: number;
  progress: number; // 0-1 range
}

/**
 * Error event with details
 */
export interface ErrorEvent extends AudioEvent {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
  originalError?: Error;
}

/**
 * Type guard for checking specific event types
 */
export function isProgressEvent(event: AudioEvent): event is ProgressEvent {
  return event.type === 'progress';
}

export function isErrorEvent(event: AudioEvent): event is ErrorEvent {
  return event.type === 'error';
}

/**
 * Listener type for audio events
 */
export type AudioEventListener = (event: AudioEvent) => void;

/**
 * Options for audio playback
 */
export interface AudioPlayOptions {
  startTime?: number;
  volume?: number;
  rate?: number;
}

/**
 * Content metadata for audio sources
 */
export interface AudioMetadata {
  id: string;
  title: string;
  source?: string;
  thumbnail?: string;
  duration?: number;
}

/**
 * Unified interface for all audio sources
 * 
 * This provides a common API for different audio implementations,
 * such as TTS and HTML5 Audio.
 */
export interface AudioSource {
  // Source identifier and metadata
  readonly id: string;
  readonly type: 'tts' | 'audio' | 'unknown';
  readonly metadata: AudioMetadata;
  
  // Playback state properties
  readonly isInitialized: boolean;
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly isStopped: boolean;
  readonly isLoading: boolean;
  readonly duration: number;
  readonly currentTime: number;
  readonly progress: number; // 0-1 range
  readonly volume: number;
  readonly playbackRate: number;

  // Content properties
  readonly contentUrl?: string; // For audio files
  readonly contentText?: string; // For TTS

  // Core methods
  initialize(): Promise<boolean>;
  load(options?: any): Promise<void>;
  play(options?: AudioPlayOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(time: number): void;
  
  // Settings
  setVolume(volume: number): void; // 0-1 range
  setPlaybackRate(rate: number): void;
  
  // Event handling
  addEventListener(eventType: AudioEventType, listener: AudioEventListener): void;
  removeEventListener(eventType: AudioEventType, listener: AudioEventListener): void;
  
  // Resource management
  dispose(): void;
}

/**
 * Base implementation of AudioSource with common functionality
 */
export abstract class BaseAudioSource implements AudioSource {
  // Source identifier and metadata
  readonly id: string;
  readonly type: 'tts' | 'audio' | 'unknown' = 'unknown';
  readonly metadata: AudioMetadata;
  
  // State management
  protected _isInitialized: boolean = false;
  protected _isPlaying: boolean = false;
  protected _isPaused: boolean = false;
  protected _isStopped: boolean = true;
  protected _isLoading: boolean = false;
  protected _duration: number = 0;
  protected _currentTime: number = 0;
  protected _volume: number = 1;
  protected _playbackRate: number = 1;
  
  // Content
  readonly contentUrl?: string;
  readonly contentText?: string;
  
  // Event handling
  protected eventListeners: Map<AudioEventType, Set<AudioEventListener>> = new Map();
  
  constructor(id: string, metadata: AudioMetadata) {
    this.id = id;
    this.metadata = metadata;
  }
  
  // State accessors
  get isInitialized(): boolean { return this._isInitialized; }
  get isPlaying(): boolean { return this._isPlaying; }
  get isPaused(): boolean { return this._isPaused; }
  get isStopped(): boolean { return this._isStopped; }
  get isLoading(): boolean { return this._isLoading; }
  get duration(): number { return this._duration; }
  get currentTime(): number { return this._currentTime; }
  get progress(): number { return this._duration > 0 ? this._currentTime / this._duration : 0; }
  get volume(): number { return this._volume; }
  get playbackRate(): number { return this._playbackRate; }
  
  // Abstract methods that must be implemented by subclasses
  abstract initialize(): Promise<boolean>;
  abstract load(options?: any): Promise<void>;
  abstract play(options?: AudioPlayOptions): Promise<void>;
  abstract pause(): void;
  abstract resume(): void;
  abstract stop(): void;
  abstract seek(time: number): void;
  abstract setVolume(volume: number): void;
  abstract setPlaybackRate(rate: number): void;
  
  // Event handling implementation
  addEventListener(eventType: AudioEventType, listener: AudioEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)?.add(listener);
  }
  
  removeEventListener(eventType: AudioEventType, listener: AudioEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }
  
  // Helper method to dispatch events
  protected dispatchEvent(event: AudioEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in audio event listener for ${event.type}:`, error);
        }
      }
    }
  }
  
  // Dispatch progress event helper
  protected dispatchProgressEvent(): void {
    this.dispatchEvent({
      type: 'progress',
      timestamp: Date.now(),
      source: this,
      currentTime: this._currentTime,
      duration: this._duration,
      progress: this.progress
    } as ProgressEvent);
  }
  
  // Dispatch error event helper
  protected dispatchErrorEvent(code: string, message: string, recoverable: boolean = false, originalError?: Error): void {
    this.dispatchEvent({
      type: 'error',
      timestamp: Date.now(),
      source: this,
      code,
      message,
      recoverable,
      originalError
    } as ErrorEvent);
  }
  
  // Resource cleanup
  dispose(): void {
    // Clear all event listeners
    this.eventListeners.clear();
    
    // Stop playback if active
    if (this.isPlaying) {
      this.stop();
    }
  }
}

/**
 * Factory function to create an audio source based on content type
 */
export interface AudioSourceFactory {
  createTtsSource(text: string, metadata: AudioMetadata): AudioSource;
  createAudioSource(url: string, metadata: AudioMetadata): AudioSource;
}