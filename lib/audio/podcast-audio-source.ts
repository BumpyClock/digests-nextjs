/**
 * Podcast Audio Source Implementation
 * 
 * This module provides an HTML5 Audio implementation of the AudioSource interface
 * for playing podcasts and other audio content.
 */

import { 
  AudioSource, 
  BaseAudioSource, 
  AudioMetadata, 
  AudioPlayOptions 
} from './audio-source';

/**
 * Podcast-specific play options
 */
export interface PodcastPlayOptions extends AudioPlayOptions {
  autoplay?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  forceReload?: boolean;
}

/**
 * Implementation of AudioSource for HTML5 Audio API
 */
export class PodcastAudioSource extends BaseAudioSource implements AudioSource {
  readonly type: 'audio' = 'audio';
  readonly contentUrl: string;
  
  // HTML5 Audio element
  private _audioElement: HTMLAudioElement | null = null;
  
  // Background buffering state
  private _isBuffering: boolean = false;
  private _loadedFraction: number = 0;
  
  // Media session state for lock screen controls
  private _hasMediaSession: boolean = false;
  
  // Event handlers storage for cleanup
  private _visibilityChangeHandler: (() => void) | null = null;
  private _beforeUnloadHandler: (() => void) | null = null;
  private _unloadHandler: (() => void) | null = null;
  
  constructor(id: string, url: string, metadata: AudioMetadata) {
    super(id, metadata);
    this.contentUrl = url;
  }
  
  /**
   * Initialize the audio player
   */
  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.dispatchErrorEvent(
        'ENVIRONMENT_ERROR',
        'Audio playback is not available in server environment',
        false
      );
      return false;
    }
    
    try {
      if (!this._audioElement) {
        this._audioElement = new Audio();
        
        // Disable auto-preload to save bandwidth
        this._audioElement.preload = 'none';
        
        // Set up event listeners
        this.setupAudioEvents();
      }
      
      // Set up visibility change handler for HTML5 Audio
      this._visibilityChangeHandler = () => {
        if (document.visibilityState === 'hidden' && this._isPlaying) {
          console.log('Visibility changed: pausing audio playback');
          this.pause();
        }
      };
      
      // Set up page unload handlers
      this._beforeUnloadHandler = () => {
        if (this._isPlaying || this._isPaused) {
          console.log('Page before unload: stopping audio playback');
          this.stop();
        }
      };
      
      this._unloadHandler = () => {
        if (this._isPlaying || this._isPaused) {
          console.log('Page unloading: stopping audio playback');
          this.stop();
        }
      };
      
      // Add event listeners
      document.addEventListener('visibilitychange', this._visibilityChangeHandler);
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
      window.addEventListener('unload', this._unloadHandler);
      
      // Check for Media Session API support
      this._hasMediaSession = 'mediaSession' in navigator;
      
      this._isInitialized = true;
      return true;
    } catch (error) {
      this.dispatchErrorEvent(
        'INITIALIZATION_FAILED',
        'Failed to initialize audio player',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }
  
  /**
   * Load audio content for playback
   */
  async load(options?: PodcastPlayOptions): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }
    
    if (!this._audioElement) {
      this.dispatchErrorEvent(
        'NOT_INITIALIZED',
        'Audio player is not initialized',
        true
      );
      return;
    }
    
    try {
      // Set loading state
      this._isLoading = true;
      this.dispatchEvent({
        type: 'loading',
        timestamp: Date.now(),
        source: this
      });
      
      // Force reload if requested or if source changed
      const forceReload = options?.forceReload || 
        (this._audioElement.src !== this.contentUrl && this.contentUrl !== '');
      
      if (forceReload) {
        this._audioElement.src = this.contentUrl;
      }
      
      // Set options
      if (options) {
        if (options.volume !== undefined) {
          this._volume = options.volume;
          this._audioElement.volume = options.volume;
        }
        
        if (options.rate !== undefined) {
          this._playbackRate = options.rate;
          this._audioElement.playbackRate = options.rate;
        }
        
        if (options.preload) {
          this._audioElement.preload = options.preload;
        }
      }
      
      // Start preloading metadata if not already loaded
      if (!this._duration && this.contentUrl) {
        this._audioElement.preload = 'metadata';
        
        // Create a promise that resolves when metadata is loaded
        await new Promise<void>((resolve, reject) => {
          // Timeout for metadata loading
          const timeout = setTimeout(() => {
            cleanup();
            // This isn't a fatal error, so resolve anyway
            resolve();
          }, 5000);
          
          const handleLoadedMetadata = () => {
            cleanup();
            resolve();
          };
          
          const handleError = (e: Event) => {
            cleanup();
            reject(new Error('Failed to load audio metadata'));
          };
          
          const cleanup = () => {
            clearTimeout(timeout);
            this._audioElement?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            this._audioElement?.removeEventListener('error', handleError);
          };
          
          this._audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
          this._audioElement.addEventListener('error', handleError);
          
          // Start loading by accessing the property
          this._audioElement.load();
        }).catch(error => {
          console.warn('Metadata preload error:', error);
          // Continue despite error - we can still try to play
        });
      }
      
      // Update duration from audio element
      if (this._audioElement.duration && !isNaN(this._audioElement.duration)) {
        this._duration = this._audioElement.duration;
      }
      
      // Set up media session if supported
      if (this._hasMediaSession) {
        this.setupMediaSession();
      }
      
      // Clear loading state
      this._isLoading = false;
      
      // Dispatch loaded event
      this.dispatchEvent({
        type: 'loaded',
        timestamp: Date.now(),
        source: this
      });
      
    } catch (error) {
      this._isLoading = false;
      this.dispatchErrorEvent(
        'LOAD_ERROR',
        'Failed to load audio content',
        true,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  /**
   * Start or resume audio playback
   */
  async play(options?: PodcastPlayOptions): Promise<void> {
    if (!this._isInitialized || !this._audioElement) {
      await this.initialize();
      
      // If still not initialized, abort
      if (!this._audioElement) {
        return;
      }
    }
    
    // If not loaded or new URL, load first
    if (this._audioElement.src !== this.contentUrl || options?.forceReload) {
      await this.load(options);
    }
    
    try {
      // Set specific start position if requested
      if (options?.startTime !== undefined && options.startTime >= 0) {
        this._audioElement.currentTime = options.startTime;
      }
      
      // Start playback
      const playPromise = this._audioElement.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      // Update state
      this._isPlaying = true;
      this._isPaused = false;
      this._isStopped = false;
      
      // Start progress tracking
      this.startProgressTracking();
      
      // Dispatch play event
      this.dispatchEvent({
        type: 'play',
        timestamp: Date.now(),
        source: this
      });
      
    } catch (error) {
      // Most common error: browser requires user interaction for play
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.dispatchErrorEvent(
          'USER_INTERACTION_REQUIRED',
          'Playback requires user interaction',
          true,
          error
        );
      } else {
        this.dispatchErrorEvent(
          'PLAYBACK_ERROR',
          'Failed to start audio playback',
          true,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }
  
  /**
   * Pause audio playback
   */
  pause(): void {
    if (!this._audioElement || !this._isPlaying) {
      return;
    }
    
    this._audioElement.pause();
    
    // Dispatch event will happen via event listener
    // State update will happen via event listener
  }
  
  /**
   * Resume paused audio playback
   */
  resume(): void {
    if (!this._audioElement || !this._isPaused) {
      return;
    }
    
    this._audioElement.play().catch(error => {
      this.dispatchErrorEvent(
        'RESUME_ERROR',
        'Failed to resume audio playback',
        true,
        error instanceof Error ? error : new Error(String(error))
      );
    });
    
    // Dispatch event will happen via event listener
    // State update will happen via event listener
  }
  
  /**
   * Stop audio playback
   */
  stop(): void {
    if (!this._audioElement) {
      return;
    }
    
    // Pause playback
    this._audioElement.pause();
    
    // Reset position
    this._audioElement.currentTime = 0;
    this._currentTime = 0;
    
    // Update state
    this._isPlaying = false;
    this._isPaused = false;
    this._isStopped = true;
    
    // Dispatch stop event
    this.dispatchEvent({
      type: 'stop',
      timestamp: Date.now(),
      source: this
    });
  }
  
  /**
   * Seek to a position in the audio
   */
  seek(time: number): void {
    if (!this._audioElement || time < 0 || time > this._duration) {
      return;
    }
    
    this._audioElement.currentTime = time;
    this._currentTime = time;
    
    // Update progress
    this.dispatchProgressEvent();
  }
  
  /**
   * Set audio volume
   */
  setVolume(volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    
    if (this._volume === volume) {
      return;
    }
    
    this._volume = volume;
    
    if (this._audioElement) {
      this._audioElement.volume = volume;
    }
    
    // Dispatch event will happen via event listener
  }
  
  /**
   * Set audio playback rate
   */
  setPlaybackRate(rate: number): void {
    if (this._playbackRate === rate) {
      return;
    }
    
    this._playbackRate = rate;
    
    if (this._audioElement) {
      this._audioElement.playbackRate = rate;
    }
    
    // Dispatch event will happen via event listener
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    
    // Clean up event listeners
    if (this._audioElement) {
      this.cleanupAudioEvents();
      this._audioElement.src = '';
      this._audioElement.load(); // Force unload
      this._audioElement = null;
    }
    
    // Remove document/window event listeners
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
    
    // Clean up media session
    if (this._hasMediaSession && 'mediaSession' in navigator) {
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.metadata = null;
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.playbackState = 'none';
    }
    
    this._isInitialized = false;
    
    super.dispose();
  }
  
  /**
   * Check if browser can play a specific media type
   */
  static canPlayType(mediaType: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const audio = document.createElement('audio');
    return audio.canPlayType(mediaType) !== '';
  }
  
  // Private helper methods
  
  /**
   * Set up event listeners for the audio element
   */
  private setupAudioEvents(): void {
    if (!this._audioElement) return;
    
    const audio = this._audioElement;
    
    // Playback events
    audio.addEventListener('play', this.handlePlay);
    audio.addEventListener('pause', this.handlePause);
    audio.addEventListener('ended', this.handleEnded);
    audio.addEventListener('timeupdate', this.handleTimeUpdate);
    
    // State events
    audio.addEventListener('durationchange', this.handleDurationChange);
    audio.addEventListener('volumechange', this.handleVolumeChange);
    audio.addEventListener('ratechange', this.handleRateChange);
    
    // Loading events
    audio.addEventListener('waiting', this.handleWaiting);
    audio.addEventListener('canplay', this.handleCanPlay);
    audio.addEventListener('canplaythrough', this.handleCanPlayThrough);
    audio.addEventListener('progress', this.handleProgress);
    
    // Error events
    audio.addEventListener('error', this.handleError);
  }
  
  /**
   * Clean up event listeners for the audio element
   */
  private cleanupAudioEvents(): void {
    if (!this._audioElement) return;
    
    const audio = this._audioElement;
    
    // Playback events
    audio.removeEventListener('play', this.handlePlay);
    audio.removeEventListener('pause', this.handlePause);
    audio.removeEventListener('ended', this.handleEnded);
    audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    
    // State events
    audio.removeEventListener('durationchange', this.handleDurationChange);
    audio.removeEventListener('volumechange', this.handleVolumeChange);
    audio.removeEventListener('ratechange', this.handleRateChange);
    
    // Loading events
    audio.removeEventListener('waiting', this.handleWaiting);
    audio.removeEventListener('canplay', this.handleCanPlay);
    audio.removeEventListener('canplaythrough', this.handleCanPlayThrough);
    audio.removeEventListener('progress', this.handleProgress);
    
    // Error events
    audio.removeEventListener('error', this.handleError);
  }
  
  /**
   * Set up media session for lock screen controls
   */
  private setupMediaSession(): void {
    if (!this._hasMediaSession || !('mediaSession' in navigator)) {
      return;
    }
    
    try {
      // Set metadata
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.metadata.title || 'Unknown Track',
        artist: this.metadata.source || 'Unknown Source',
        artwork: this.metadata.thumbnail ? [
          { src: this.metadata.thumbnail, sizes: '512x512', type: 'image/png' }
        ] : undefined
      });
      
      // Set action handlers
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      // @ts-ignore - MediaSession API might not be fully typed
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
      
      // Add seek handlers if supported
      try {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            this.seek(details.seekTime);
          }
        });
      } catch (e) {
        console.warn('Media Session "seekto" not supported');
      }
      
      // Add skip handlers if supported
      try {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          const skipTime = 10; // 10 seconds
          const newTime = Math.max(0, this._currentTime - skipTime);
          this.seek(newTime);
        });
        
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.setActionHandler('seekforward', () => {
          const skipTime = 30; // 30 seconds
          const newTime = Math.min(this._duration, this._currentTime + skipTime);
          this.seek(newTime);
        });
      } catch (e) {
        console.warn('Media Session skip actions not supported');
      }
    } catch (error) {
      console.error('Failed to setup media session:', error);
    }
  }
  
  /**
   * Update media session playback state
   */
  private updateMediaSessionState(): void {
    if (!this._hasMediaSession || !('mediaSession' in navigator)) {
      return;
    }
    
    try {
      if (this._isPlaying) {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.playbackState = 'playing';
      } else if (this._isPaused) {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.playbackState = 'paused';
      } else {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.playbackState = 'none';
      }
      
      // Update position state if supported
      if ('setPositionState' in navigator.mediaSession) {
        // @ts-ignore - MediaSession API might not be fully typed
        navigator.mediaSession.setPositionState({
          duration: this._duration || 0,
          position: this._currentTime || 0,
          playbackRate: this._playbackRate
        });
      }
    } catch (error) {
      console.warn('Failed to update media session state:', error);
    }
  }
  
  /**
   * Start tracking progress (polls the audio element)
   */
  private startProgressTracking(): void {
    // Define the update function using RAF
    const updateProgress = () => {
      if (!this._audioElement || !this._isPlaying) {
        return;
      }
      
      // Update current time from audio element
      this._currentTime = this._audioElement.currentTime;
      
      // Dispatch progress event
      this.dispatchProgressEvent();
      
      // Schedule next update
      if (this._isPlaying) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    // Start updating
    requestAnimationFrame(updateProgress);
  }
  
  /**
   * Event handlers for audio element events
   */
  private handlePlay = (): void => {
    this._isPlaying = true;
    this._isPaused = false;
    this._isStopped = false;
    
    // Update media session
    this.updateMediaSessionState();
    
    // Dispatch event
    this.dispatchEvent({
      type: 'play',
      timestamp: Date.now(),
      source: this
    });
    
    // Start progress tracking
    this.startProgressTracking();
  };
  
  private handlePause = (): void => {
    // Check if this is an actual pause or if playback ended
    if (this._audioElement && 
        this._audioElement.currentTime < this._audioElement.duration) {
      this._isPlaying = false;
      this._isPaused = true;
      
      // Update media session
      this.updateMediaSessionState();
      
      // Dispatch event
      this.dispatchEvent({
        type: 'pause',
        timestamp: Date.now(),
        source: this
      });
    }
  };
  
  private handleEnded = (): void => {
    this._isPlaying = false;
    this._isPaused = false;
    this._isStopped = true;
    this._currentTime = this._duration;
    
    // Update media session
    this.updateMediaSessionState();
    
    // Dispatch event
    this.dispatchEvent({
      type: 'end',
      timestamp: Date.now(),
      source: this
    });
  };
  
  private handleTimeUpdate = (): void => {
    if (!this._audioElement) return;
    
    this._currentTime = this._audioElement.currentTime;
    
    // Media session updates
    this.updateMediaSessionState();
  };
  
  private handleDurationChange = (): void => {
    if (!this._audioElement) return;
    
    const newDuration = this._audioElement.duration;
    if (!isNaN(newDuration) && newDuration > 0) {
      this._duration = newDuration;
    }
  };
  
  private handleVolumeChange = (): void => {
    if (!this._audioElement) return;
    
    this._volume = this._audioElement.volume;
    
    // Dispatch event
    this.dispatchEvent({
      type: 'volumechange',
      timestamp: Date.now(),
      source: this
    });
  };
  
  private handleRateChange = (): void => {
    if (!this._audioElement) return;
    
    this._playbackRate = this._audioElement.playbackRate;
    
    // Dispatch event
    this.dispatchEvent({
      type: 'ratechange',
      timestamp: Date.now(),
      source: this
    });
  };
  
  private handleWaiting = (): void => {
    this._isBuffering = true;
    
    // Could dispatch a buffering event here if needed
  };
  
  private handleCanPlay = (): void => {
    this._isBuffering = false;
    
    // Could dispatch a buffering-end event here if needed
  };
  
  private handleCanPlayThrough = (): void => {
    this._isBuffering = false;
    this._loadedFraction = 1.0;
  };
  
  private handleProgress = (): void => {
    if (!this._audioElement) return;
    
    // Update buffered ranges
    const buffered = this._audioElement.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      this._loadedFraction = bufferedEnd / (this._duration || 1);
    }
  };
  
  private handleError = (event: Event): void => {
    if (!this._audioElement) return;
    
    const error = this._audioElement.error;
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Unknown audio playback error';
    let isRecoverable = false;
    
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorCode = 'PLAYBACK_ABORTED';
          errorMessage = 'Playback aborted by the user';
          isRecoverable = true;
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network error while loading the audio';
          isRecoverable = true;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorCode = 'DECODE_ERROR';
          errorMessage = 'Audio decoding failed';
          isRecoverable = false;
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorCode = 'FORMAT_ERROR';
          errorMessage = 'Audio format not supported';
          isRecoverable = false;
          break;
      }
    }
    
    // Update state
    this._isPlaying = false;
    this._isPaused = false;
    this._isStopped = true;
    
    // Dispatch error event
    this.dispatchErrorEvent(errorCode, errorMessage, isRecoverable);
  };
}