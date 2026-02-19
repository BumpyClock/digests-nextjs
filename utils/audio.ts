import { toast } from "sonner";
import { Logger } from "@/utils/logger";

interface AudioError {
  code: string;
  message: string;
  originalError?: Error;
}

/**
 * Handles audio playback errors with user-friendly messages
 */
export function handleAudioError(error: unknown, audioTitle?: string): AudioError {
  Logger.error("Audio playback error", error instanceof Error ? error : undefined);

  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = "Failed to play audio";

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("network") || error.message.includes("fetch")) {
      errorCode = "NETWORK_ERROR";
      errorMessage = "Network error: Please check your connection";
    }
    // Permission errors
    else if (error.message.includes("NotAllowedError")) {
      errorCode = "PERMISSION_ERROR";
      errorMessage = "Audio playback requires user interaction";
    }
    // Format/codec errors
    else if (error.message.includes("NotSupportedError") || error.message.includes("format")) {
      errorCode = "FORMAT_ERROR";
      errorMessage = "Audio format not supported";
    }
    // Source not found
    else if (error.message.includes("404") || error.message.includes("not found")) {
      errorCode = "NOT_FOUND";
      errorMessage = "Audio file not found";
    }
    // Aborted by user
    else if (error.name === "AbortError") {
      errorCode = "ABORTED";
      errorMessage = "Playback cancelled";
    }
    // Generic media error
    else if (error.name === "MediaError") {
      errorCode = "MEDIA_ERROR";
      errorMessage = "Media playback failed";
    }
  }

  // Show toast with error message
  const toastMessage = audioTitle ? `${errorMessage}: "${audioTitle}"` : errorMessage;

  toast.error("Playback Error", {
    description: toastMessage,
  });

  return {
    code: errorCode,
    message: errorMessage,
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * Formats time in seconds to MM:SS format
 * @param time - Time in seconds
 * @returns Formatted time string (e.g., "3:45" or "12:03")
 */
export function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) {
    return "0:00";
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}
