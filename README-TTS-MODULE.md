# TTS (Text-to-Speech) Module

This document provides an overview of the Text-to-Speech (TTS) module architecture and implementation.

## Architecture Overview

The TTS module follows a clean, layered architecture with separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI LAYER                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ ArticleReader │  │ MiniPlayer    │  │ InlineTtsPlayer   │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘   │
│          │                  │                    │             │
│          └──────────────────┼────────────────────┘             │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        STATE LAYER                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              TTS State Store (useTtsStore)                │  │
│  │                                                           │  │
│  │  ┌────────────┐   ┌────────────┐   ┌────────────────┐    │  │
│  │  │ AudioState │   │ PlayerMode │   │ Settings       │    │  │
│  │  └────────────┘   └────────────┘   └────────────────┘    │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     SERVICE LAYER                               │
│  ┌───────────────────┐    ┌───────────────────────────────┐    │
│  │ TTS Engine        │    │ TTS Adapter                   │    │
│  │                   │    │ ┌─────────────────────────┐   │    │
│  │ - initEngine()    │◄───┤ │ Adapter Implementation  │   │    │
│  │ - speak()         │    │ └─────────────────────────┘   │    │
│  │ - pause()         │    │                               │    │
│  │ - stop()          │    │                               │    │
│  │ - getVoices()     │◄───┤                               │    │
│  └───────────────────┘    └───────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Service Layer

#### TTS Engine (`lib/tts-engine.ts`)
- Core TTS functionality using Web Speech API and adapter pattern
- Provides TTS capabilities as a service layer
- Implements event-based architecture for state updates
- Handles browser compatibility and error management

#### TTS Audio Adapter (`components/tts-audio-adapter.ts`)
- Bridges between TTS engine and audio player interfaces
- Translates TTS events to audio player events
- Provides a clean API for integrating TTS with player components

### 2. State Layer

#### TTS State Store (`store/useTtsStore.ts`)
- Central state management using Zustand
- Manages TTS state, settings, and player mode
- Provides actions for state mutations
- Persists settings across sessions

#### TTS Player Mode Transitions (`hooks/use-tts-player-mode.tsx`)
- State machine for TTS player mode transitions
- Defines valid transitions between player modes
- Handles transition side-effects and logic

### 3. UI Layer

#### Inline TTS Player (`components/Feed/ArticleReader/InlineTtsPlayer.tsx`)
- In-article player component with playback controls
- Displays progress, duration, and playback rate controls
- Supports minimization to mini player mode

#### TTS Error Handler (`components/tts-error-handler.tsx`)
- Monitors for TTS errors and displays appropriate feedback
- Provides error recovery actions
- Integrates with toast notifications

## Usage Examples

### Basic Usage

```tsx
// Import the necessary hooks
import { useTtsPlayback, useTtsPlayerMode, PlayerMode } from '@/store/useTtsStore';
import { useTtsPlayerModeTransitions } from '@/hooks/use-tts-player-mode';

// Component using TTS
function MyComponent() {
  // Access TTS playback controls
  const { isPlaying, play, pause, resume, stop } = useTtsPlayback();
  
  // Or use the transitions hook for more structured control
  const { playInline, playMini, toggleMode, stopPlayer } = useTtsPlayerModeTransitions();
  
  // Play text in inline mode
  const handlePlay = () => {
    playInline("This is the text to speak", {
      title: "Article Title",
      source: "Article Source",
      thumbnail: "/path/to/image.jpg"
    });
  };
  
  return (
    <div>
      <button onClick={handlePlay}>Play</button>
      <button onClick={toggleMode}>Toggle Mode</button>
      <button onClick={stopPlayer}>Stop</button>
    </div>
  );
}
```

### Using Player Components

```tsx
// Import the player component
import { InlineTtsPlayer } from '@/components/Feed/ArticleReader/InlineTtsPlayer';

// Component with TTS player
function ArticleView() {
  return (
    <div>
      <article>
        {/* Article content */}
      </article>
      
      {/* TTS Player */}
      <InlineTtsPlayer 
        minimizable={true}
        onMinimize={() => console.log('Minimized')}
      />
    </div>
  );
}
```

### Error Handling

```tsx
// Import error handler
import { TtsErrorHandler, useTtsErrorHandler } from '@/components/tts-error-handler';

// Component with error handling
function App() {
  // Use the error handler hook
  const { error, errorType, message, recovery, isRecoverable } = useTtsErrorHandler();
  
  // Show custom error UI
  if (error) {
    return (
      <div>
        <p>Error: {message}</p>
        {isRecoverable && (
          <button onClick={recovery}>Retry</button>
        )}
      </div>
    );
  }
  
  return (
    <div>
      {/* App content */}
      
      {/* Global error handler */}
      <TtsErrorHandler />
    </div>
  );
}
```

## State Machine for Player Modes

The TTS player has three possible modes:

1. **DISABLED** - TTS is not active
2. **INLINE** - TTS is playing within the article context
3. **MINI** - TTS is playing in a mini player (minimized mode)

Valid transitions between these modes are defined in the state machine:

```
┌────────────┐   playInline()   ┌────────────┐
│  DISABLED  │─────────────────►│   INLINE   │
└────────────┘                  └─────┬──────┘
      ▲                               │
      │                               │
      │                       minimize()
      │                               │
      │                               ▼
      │                         ┌────────────┐
      └─────────────────────────┤    MINI    │
           stop()               └────────────┘
```

## Error Handling Strategy

The TTS module implements comprehensive error handling:

1. **Error Types**:
   - `BROWSER_UNSUPPORTED` - Browser doesn't support TTS
   - `INITIALIZATION_FAILED` - Failed to initialize TTS engine
   - `NO_VOICES_AVAILABLE` - No TTS voices found
   - `SPEECH_ERROR` - Error during speech synthesis
   - `PLAYBACK_ERROR` - Error during playback
   - `NETWORK_ERROR` - Network-related errors
   - `UNKNOWN_ERROR` - Other unspecified errors

2. **Recovery Actions**:
   - Re-initialization of the TTS engine
   - Voice refreshing
   - Playback restart
   - User-facing feedback with retry options

## Browser Compatibility

The TTS module is designed to work across modern browsers with graceful degradation:

- **Full Support**: Chrome, Edge, Safari, Firefox
- **Partial Support**: Older browsers with Web Speech API
- **Fallback**: Error messages for unsupported browsers

## Adding New TTS Providers

The adapter pattern allows adding new TTS providers:

1. Implement the `ITtsProvider` interface
2. Register the provider with the TTS engine
3. Update settings UI to allow provider selection

Example for adding a cloud provider:

```typescript
class CloudTtsProvider extends BaseTtsProvider {
  // Implementation details
}

// Register the provider
ttsEngine.registerProvider(new CloudTtsProvider());
```

## Future Improvements

- Add support for additional TTS providers (e.g., ElevenLabs, AWS Polly)
- Improve text highlighting during speech
- Add voice selection UI
- Implement offline capabilities using cached audio
- Add support for different languages and accents