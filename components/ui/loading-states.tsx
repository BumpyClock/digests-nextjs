"use client";

import React from "react";
import { LoadingState, LoadingStateType } from "@/hooks/useLoadingState";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingIndicatorProps {
  state: LoadingStateType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingIndicator({ state, size = "md", className }: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-6 w-6",
  };

  const iconClass = cn(sizeClasses[size], className);

  switch (state) {
    case "loading":
    case "initializing":
      return <Loader2 className={cn(iconClass, "animate-spin text-primary")} />;
    case "refreshing":
      return <RefreshCw className={cn(iconClass, "animate-spin text-blue-500")} />;
    case "error":
      return <AlertCircle className={cn(iconClass, "text-destructive")} />;
    case "success":
      return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
    default:
      return null;
  }
}

interface LoadingOverlayProps {
  loadingState: LoadingState;
  children: React.ReactNode;
  showOverlay?: boolean;
  overlayOpacity?: number;
  className?: string;
}

export function LoadingOverlay({ 
  loadingState, 
  children, 
  showOverlay = true,
  overlayOpacity = 0.6,
  className 
}: LoadingOverlayProps) {
  const isLoading = loadingState.isLoading || loadingState.isRefreshing || loadingState.isInitializing;

  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && showOverlay && (
        <div 
          className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10"
          style={{ backgroundColor: `rgba(255, 255, 255, ${overlayOpacity})` }}
        >
          <div className="flex flex-col items-center gap-2">
            <LoadingIndicator state={loadingState.state} size="lg" />
            <span className="text-sm text-muted-foreground">
              {getLoadingMessage(loadingState.state)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}

export function LoadingSkeleton({ lines = 3, className, showAvatar = false }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-secondary rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-secondary rounded w-[200px] animate-pulse" />
            <div className="h-3 bg-secondary rounded w-[150px] animate-pulse" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-secondary rounded animate-pulse",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

interface LoadingButtonProps {
  loadingState: LoadingState;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function LoadingButton({ 
  loadingState, 
  children, 
  disabled, 
  className,
  size = "md",
  onClick 
}: LoadingButtonProps) {
  const isLoading = loadingState.isLoading || loadingState.isRefreshing || loadingState.isInitializing;
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        {
          "h-8 px-3 text-xs": size === "sm",
          "h-10 px-4 py-2 text-sm": size === "md", 
          "h-12 px-6 text-base": size === "lg",
        },
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      disabled={isDisabled}
      onClick={onClick}
    >
      {isLoading && <LoadingIndicator state={loadingState.state} size="sm" />}
      {children}
    </button>
  );
}

interface LoadingMessageProps {
  loadingState: LoadingState;
  messages?: Partial<Record<LoadingStateType, string>>;
  showIcon?: boolean;
  className?: string;
}

export function LoadingMessage({ 
  loadingState, 
  messages = {},
  showIcon = true,
  className 
}: LoadingMessageProps) {
  const defaultMessages = {
    idle: "",
    loading: "Loading...",
    refreshing: "Refreshing...",
    initializing: "Initializing...",
    success: "Success!",
    error: loadingState.error?.message || "An error occurred",
  };

  const allMessages = { ...defaultMessages, ...messages };
  const message = allMessages[loadingState.state];

  if (!message) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {showIcon && <LoadingIndicator state={loadingState.state} size="sm" />}
      <span className={cn({
        "text-muted-foreground": loadingState.state === "loading" || loadingState.state === "refreshing" || loadingState.state === "initializing",
        "text-green-600": loadingState.state === "success",
        "text-destructive": loadingState.state === "error",
      })}>
        {message}
      </span>
    </div>
  );
}

interface LoadingStateGuardProps {
  loadingState: LoadingState;
  children: React.ReactNode;
  fallback?: {
    loading?: React.ReactNode;
    refreshing?: React.ReactNode;
    initializing?: React.ReactNode;
    error?: React.ReactNode;
    success?: React.ReactNode;
  };
}

export function LoadingStateGuard({ loadingState, children, fallback = {} }: LoadingStateGuardProps) {
  const defaultFallbacks = {
    loading: <LoadingSkeleton />,
    refreshing: <LoadingSkeleton />,
    initializing: <LoadingSkeleton />,
    error: (
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        {loadingState.error?.message || "Something went wrong"}
      </div>
    ),
    success: children,
  };

  const activeFallback = fallback[loadingState.state] ?? defaultFallbacks[loadingState.state];

  if (loadingState.state === "idle" || loadingState.state === "success") {
    return <>{children}</>;
  }

  return <>{activeFallback}</>;
}

// Helper function to get loading messages
function getLoadingMessage(state: LoadingStateType): string {
  switch (state) {
    case "loading":
      return "Loading...";
    case "refreshing":
      return "Refreshing data...";
    case "initializing":
      return "Initializing...";
    case "success":
      return "Complete!";
    case "error":
      return "Failed to load";
    default:
      return "";
  }
}