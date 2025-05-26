"use client";

import React, { useEffect, useState, useRef, memo } from "react";
import { useUnifiedAudioStore } from "@/store/useUnifiedAudioStore";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Volume2Off, Repeat } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Error types that can occur in the TTS system
 */
export enum TtsErrorType {
  BROWSER_UNSUPPORTED = "BROWSER_UNSUPPORTED",
  INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
  NO_VOICES_AVAILABLE = "NO_VOICES_AVAILABLE",
  SPEECH_ERROR = "SPEECH_ERROR",
  PLAYBACK_ERROR = "PLAYBACK_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

/**
 * Maps error codes from the TTS engine to error types
 */
const mapErrorCodeToType = (code: string): TtsErrorType => {
  switch (code) {
    case "NOT_SUPPORTED":
      return TtsErrorType.BROWSER_UNSUPPORTED;
    case "INITIALIZATION_FAILED":
      return TtsErrorType.INITIALIZATION_FAILED;
    case "NO_VOICES":
      return TtsErrorType.NO_VOICES_AVAILABLE;
    case "SPEECH_ERROR":
      return TtsErrorType.SPEECH_ERROR;
    case "NETWORK_ERROR":
      return TtsErrorType.NETWORK_ERROR;
    default:
      return TtsErrorType.UNKNOWN_ERROR;
  }
};

/**
 * Friendly error messages for different error types
 */
const getErrorMessage = (type: TtsErrorType): string => {
  switch (type) {
    case TtsErrorType.BROWSER_UNSUPPORTED:
      return "Your browser doesn't support text-to-speech. Try a modern browser like Chrome or Edge.";
    case TtsErrorType.INITIALIZATION_FAILED:
      return "Failed to initialize the text-to-speech engine. Please try again.";
    case TtsErrorType.NO_VOICES_AVAILABLE:
      return "No text-to-speech voices found. Try refreshing the page.";
    case TtsErrorType.SPEECH_ERROR:
      return "An error occurred during speech playback. Please try again.";
    case TtsErrorType.PLAYBACK_ERROR:
      return "Failed to play the text-to-speech audio. Please try again.";
    case TtsErrorType.NETWORK_ERROR:
      return "A network error occurred while fetching text-to-speech resources.";
    case TtsErrorType.UNKNOWN_ERROR:
      return "An unknown error occurred with text-to-speech. Please try again.";
  }
};

/**
 * Recovery actions for different error types
 */
const getRecoveryAction = (type: TtsErrorType, error: Error | null): (() => void) | null => {
  // Don't access the store during render - only when the function is called
  switch (type) {
    case TtsErrorType.BROWSER_UNSUPPORTED:
      // No recovery possible, browser needs to be changed
      return null;
    case TtsErrorType.INITIALIZATION_FAILED:
      // Try to re-initialize
      return () => {
        // Get fresh state when the action is actually called
        const ttsState = useUnifiedAudioStore.getState();
        ttsState.initialize();
      };
    case TtsErrorType.NO_VOICES_AVAILABLE:
      // Try to refresh voices
      return () => {
        const ttsState = useUnifiedAudioStore.getState();
        ttsState.refreshVoices();
      };
    case TtsErrorType.SPEECH_ERROR:
    case TtsErrorType.PLAYBACK_ERROR:
      // Try to restart speech
      return () => {
        const ttsState = useUnifiedAudioStore.getState();
        const { currentText, currentArticle } = ttsState;
        if (currentText) {
          ttsState.play(currentText, currentArticle);
        }
      };
    default:
      // General retry
      return () => {
        const ttsState = useUnifiedAudioStore.getState();
        ttsState.initialize();
      };
  }
};

/**
 * Component to display error banners
 */
interface TtsErrorBannerProps {
  error: Error;
  type: TtsErrorType;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const TtsErrorBanner: React.FC<TtsErrorBannerProps> = ({
  error,
  type,
  onRetry,
  onDismiss
}) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <div className="flex items-center justify-between w-full">
        <div>
          <AlertTitle className="flex items-center gap-2">
            Text-to-Speech Error
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </AlertTitle>
          <AlertDescription>{getErrorMessage(type)}</AlertDescription>
          {error && error.message && (
            <AlertDescription className="text-xs mt-1 opacity-80">
              {error.message}
            </AlertDescription>
          )}
        </div>
        <div className="flex gap-2">
          {onRetry && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRetry}
              className="flex items-center gap-1"
            >
              <Repeat className="h-3 w-3" />
              Retry
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Alert>
  );
};

/**
 * TTS Error Handler Component
 * 
 * This component monitors for TTS errors and displays appropriate UI feedback.
 * It can be placed anywhere in the app and will only render when there's an error.
 */
export const TtsErrorHandler = memo(function TtsErrorHandler() {
  // Use React's useState and useEffect to get store values
  const [storeState, setStoreState] = React.useState(() => ({
    error: null as Error | null,
    isInitialized: false
  }));
  
  // Subscribe to store changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial update
    const currentState = useUnifiedAudioStore.getState();
    setStoreState({
      error: currentState.error,
      isInitialized: currentState.isInitialized
    });
    
    // Subscribe to changes
    const unsubscribe = useUnifiedAudioStore.subscribe(
      (state) => ({
        error: state.error,
        isInitialized: state.isInitialized
      }),
      (newState) => {
        setStoreState(newState);
      }
    );
    
    return unsubscribe;
  }, []);
  
  const [errorType, setErrorType] = useState<TtsErrorType | null>(null);
  const { toast } = useToast();
  
  // Only show toast when error changes, not on each render
  const errorMessage = storeState.error?.message;
  const errorRef = useRef(errorMessage);
  
  // Monitor for errors - use refs to avoid excessive effect triggers
  useEffect(() => {
    // Only run when error changes
    if (storeState.error && errorMessage !== errorRef.current) {
      errorRef.current = errorMessage;
      
      // Determine error type
      let type = TtsErrorType.UNKNOWN_ERROR;
      
      // Check for browser support
      if (errorMessage?.includes("not supported")) {
        type = TtsErrorType.BROWSER_UNSUPPORTED;
      } 
      // Check for initialization errors
      else if (errorMessage?.includes("Failed to initialize") || !storeState.isInitialized) {
        type = TtsErrorType.INITIALIZATION_FAILED;
      }
      // Check for voice errors
      else if (errorMessage?.includes("No voice")) {
        type = TtsErrorType.NO_VOICES_AVAILABLE;
      }
      // Check for speech errors
      else if (errorMessage?.includes("speech") || errorMessage?.includes("speak")) {
        type = TtsErrorType.SPEECH_ERROR;
      }
      // Check for network errors
      else if (errorMessage?.includes("network")) {
        type = TtsErrorType.NETWORK_ERROR;
      }
      
      setErrorType(type);
      
      // Show toast notification
      const action = getRecoveryAction(type, storeState.error);
      
      toast({
        variant: "destructive",
        title: "Text-to-Speech Error",
        description: getErrorMessage(type),
        action: action ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (action) action();
            }}
          >
            Retry
          </Button>
        ) : undefined
      });
    } else if (!storeState.error && errorRef.current) {
      // Clear error reference when error is cleared
      errorRef.current = undefined;
      setErrorType(null);
    }
  }, [storeState.error, errorMessage, storeState.isInitialized, toast]);
  
  // Don't render anything if there's no error
  if (!storeState.error || !errorType) return null;
  
  const recoveryAction = getRecoveryAction(errorType, storeState.error);
  
  return (
    <TtsErrorBanner
      error={storeState.error}
      type={errorType}
      onRetry={recoveryAction || undefined}
      onDismiss={() => setErrorType(null)}
    />
  );
});

/**
 * Hook for handling TTS errors programmatically
 */
export function useTtsErrorHandler() {
  const store = useUnifiedAudioStore();
  const { error, isInitialized } = store;
  const [errorType, setErrorType] = useState<TtsErrorType | null>(null);
  
  // Determine error type when an error occurs
  useEffect(() => {
    if (error) {
      // Process error code if available
      if (error instanceof Error && (error as any).code) {
        const code = (error as any).code;
        setErrorType(mapErrorCodeToType(code));
      } else {
        // Otherwise infer from message
        const errorMessage = error.message || "";
        let type = TtsErrorType.UNKNOWN_ERROR;
        
        if (errorMessage.includes("not supported")) {
          type = TtsErrorType.BROWSER_UNSUPPORTED;
        } 
        else if (errorMessage.includes("Failed to initialize") || !isInitialized) {
          type = TtsErrorType.INITIALIZATION_FAILED;
        }
        else if (errorMessage.includes("No voice")) {
          type = TtsErrorType.NO_VOICES_AVAILABLE;
        }
        else if (errorMessage.includes("speech") || errorMessage.includes("speak")) {
          type = TtsErrorType.SPEECH_ERROR;
        }
        else if (errorMessage.includes("network")) {
          type = TtsErrorType.NETWORK_ERROR;
        }
        
        setErrorType(type);
      }
    } else {
      setErrorType(null);
    }
  }, [error, isInitialized]);
  
  const getRecovery = () => {
    if (!errorType || !error) return null;
    return getRecoveryAction(errorType, error);
  };
  
  const getMessage = () => {
    if (!errorType) return "";
    return getErrorMessage(errorType);
  };
  
  return {
    error,
    errorType,
    message: getMessage(),
    recovery: getRecovery(),
    isRecoverable: !!getRecovery()
  };
}

export default TtsErrorHandler;