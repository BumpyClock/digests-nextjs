/**
 * Audio Source Factory
 * 
 * This module provides factory functions to create the appropriate audio source
 * based on content type and platform capabilities.
 */

import { 
  AudioSource, 
  AudioMetadata, 
  AudioSourceFactory 
} from './audio-source';
import { TtsAudioSource, TtsOptions } from './tts-audio-source';
import { PodcastAudioSource, PodcastPlayOptions } from './podcast-audio-source';

/**
 * Default implementation of AudioSourceFactory
 */
export class DefaultAudioSourceFactory implements AudioSourceFactory {
  /**
   * Create a TTS audio source for text content
   */
  createTtsSource(text: string, metadata: AudioMetadata, options?: TtsOptions): TtsAudioSource {
    const id = metadata.id || `tts-${Date.now()}`;
    return new TtsAudioSource(id, text, metadata);
  }
  
  /**
   * Create an audio source for podcast/audio content
   */
  createAudioSource(url: string, metadata: AudioMetadata, options?: PodcastPlayOptions): PodcastAudioSource {
    const id = metadata.id || `audio-${Date.now()}`;
    return new PodcastAudioSource(id, url, metadata);
  }
  
  /**
   * Determine the best audio source for a given content
   */
  createBestAudioSource(options: {
    id?: string;
    title: string;
    source?: string;
    thumbnail?: string;
    audioUrl?: string;
    textContent?: string;
  }): AudioSource {
    const id = options.id || `audio-${Date.now()}`;
    
    // Create metadata object
    const metadata: AudioMetadata = {
      id,
      title: options.title,
      source: options.source || '',
      thumbnail: options.thumbnail
    };
    
    // If audio URL is provided, prefer that for audio content
    if (options.audioUrl) {
      return this.createAudioSource(options.audioUrl, metadata);
    }
    // If text content is provided, use TTS
    else if (options.textContent) {
      return this.createTtsSource(options.textContent, metadata);
    }
    // If neither is provided, throw an error
    else {
      throw new Error('Cannot create audio source: no content provided');
    }
  }
}

// Export singleton instance
export const audioSourceFactory = new DefaultAudioSourceFactory();