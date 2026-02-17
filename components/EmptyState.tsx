import { type ReactNode, isValidElement, cloneElement } from "react";
import Link from "next/link";
import {
  type LucideIcon,
  Rss,
  Search,
  Newspaper,
  Headphones,
  Bookmark,
  AlertCircle,
  WifiOff,
  Inbox,
  CheckCircle,
  Podcast,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  /** Primary heading text */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional icon component from lucide-react */
  icon?: LucideIcon | ReactNode;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Additional footer content */
  footer?: ReactNode;
  /** Custom className for container */
  className?: string;
  /** Size variant for visual hierarchy */
  size?: "compact" | "default" | "spacious";
}

// ============================================================================
// Variants
// ============================================================================

const emptyStateVariants = cva("flex flex-col items-center justify-center text-center", {
  variants: {
    size: {
      compact: "py-8 px-4 gap-3",
      default: "py-12 px-6 gap-4",
      spacious: "py-16 px-6 gap-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const iconVariants = cva("empty-state-enter empty-state-delay-1 text-secondary-content", {
  variants: {
    size: {
      compact: "h-10 w-10 mb-2",
      default: "h-16 w-16 mb-3",
      spacious: "h-20 w-20 mb-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const titleVariants = cva("empty-state-enter empty-state-delay-2 text-primary-content", {
  variants: {
    size: {
      compact: "text-title mb-1",
      default: "text-title-large mb-2",
      spacious: "text-display-small mb-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const descriptionVariants = cva(
  "empty-state-enter empty-state-delay-3 text-secondary-content max-w-md",
  {
    variants: {
      size: {
        compact: "text-body-small mb-4",
        default: "text-body mb-6",
        spacious: "text-body-large mb-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

// ============================================================================
// Action Button Component
// ============================================================================

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  icon?: LucideIcon;
  className?: string;
}

function ActionButton({
  label,
  onClick,
  href,
  variant = "default",
  size = "default",
  icon: Icon,
  className,
}: ActionButtonProps) {
  const buttonClassName = cn(
    "min-h-[44px] min-w-[44px]", // WCAG 2.5.5: 44x44px minimum touch target
    className
  );

  const buttonProps = {
    className: buttonClassName,
    ...(onClick && { onClick }),
  };

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {label}
    </>
  );

  if (href) {
    return (
      <Button asChild variant={variant} size={size} {...buttonProps}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} {...buttonProps}>
      {content}
    </Button>
  );
}

// ============================================================================
// Main EmptyState Component
// ============================================================================

/**
 * EmptyState - A flexible empty state component with proper accessibility
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No feeds yet"
 *   description="Add some RSS feeds in the settings to get started."
 *   icon={Rss}
 *   primaryAction={{ label: "Go to Settings", href: "/web/settings" }}
 * />
 * ```
 *
 * @example Compact variant
 * ```tsx
 * <EmptyState
 *   size="compact"
 *   title="No results"
 *   description="Try adjusting your search filters."
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  footer,
  className,
  size = "default",
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;

    // Lucide/react components may be function components or forwardRef objects.
    const isComponentLike =
      typeof icon === "function" ||
      (typeof icon === "object" && icon !== null && ("$$typeof" in icon || "render" in icon));
    if (isComponentLike) {
      const Icon = icon as LucideIcon;
      return <Icon className={iconVariants({ size })} aria-hidden="true" />;
    }

    // React element clone
    if (isValidElement(icon)) {
      const iconElement = icon as React.ReactElement<{ className?: string }>;
      return cloneElement(iconElement, {
        className: cn(iconVariants({ size }), iconElement.props.className),
        "aria-hidden": "true",
      } as React.HTMLAttributes<HTMLElement>);
    }

    // Fallback renderable node
    return (
      <span className={iconVariants({ size })} aria-hidden="true">
        {icon}
      </span>
    );
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: Empty state is not a form result; <output> is semantically incorrect
    <div
      className={cn(emptyStateVariants({ size }), className)}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* Icon Section */}
      {icon && (
        <div
          className="flex items-center justify-center"
          style={{ willChange: "transform, opacity" }}
        >
          {renderIcon()}
        </div>
      )}

      {/* Title Section */}
      <h2 className={titleVariants({ size })}>{title}</h2>

      {/* Description Section */}
      {description && <p className={descriptionVariants({ size })}>{description}</p>}

      {/* Actions Section */}
      {(primaryAction || secondaryAction) && (
        <div
          className={cn(
            "empty-state-enter empty-state-delay-4",
            "flex flex-col items-center gap-3",
            "sm:flex-row sm:gap-4" // Horizontal layout on larger screens
          )}
        >
          {primaryAction && (
            <ActionButton
              label={primaryAction.label}
              onClick={primaryAction.onClick}
              href={primaryAction.href}
              icon={primaryAction.icon}
              variant="default"
              size={size === "compact" ? "sm" : "default"}
            />
          )}
          {secondaryAction && (
            <ActionButton
              label={secondaryAction.label}
              onClick={secondaryAction.onClick}
              href={secondaryAction.href}
              variant="ghost"
              size={size === "compact" ? "sm" : "default"}
            />
          )}
        </div>
      )}

      {/* Footer Section */}
      {footer && (
        <div className="empty-state-enter empty-state-delay-4 mt-4 text-caption text-secondary-content">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Preset Variants for Common Use Cases
// ============================================================================

export interface EmptyStatePresetProps {
  className?: string;
  primaryActionHref?: string;
  onPrimaryAction?: () => void;
}

/**
 * No feeds empty state - shown when user has no subscriptions
 */
export function EmptyStateNoFeeds({
  className,
  primaryActionHref = "/web/settings",
  onPrimaryAction,
}: EmptyStatePresetProps) {
  return (
    <EmptyState
      title="No feeds yet"
      description="Add some RSS feeds in the settings to get started."
      icon={Rss}
      primaryAction={{
        label: "Go to Settings",
        href: primaryActionHref,
        onClick: onPrimaryAction,
      }}
      className={className}
    />
  );
}

/**
 * No search results empty state
 */
export function EmptyStateNoResults({ className }: EmptyStatePresetProps) {
  return (
    <EmptyState
      size="compact"
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      icon={Search}
      className={className}
    />
  );
}

/**
 * No articles empty state
 */
export function EmptyStateNoArticles({ className }: EmptyStatePresetProps) {
  return (
    <EmptyState
      title="No articles yet"
      description="Articles from your feeds will appear here once they're published."
      icon={Newspaper}
      className={className}
    />
  );
}

/**
 * No podcasts empty state
 */
export function EmptyStateNoPodcasts({ className }: EmptyStatePresetProps) {
  return (
    <EmptyState
      title="No podcasts yet"
      description="Podcast episodes from your feeds will appear here."
      icon={Headphones}
      className={className}
    />
  );
}

/**
 * No saved items empty state
 */
export function EmptyStateNoSaved({ className }: EmptyStatePresetProps) {
  return (
    <EmptyState
      title="No saved items"
      description="Bookmark articles and podcasts to find them here later."
      icon={Bookmark}
      className={className}
    />
  );
}

/**
 * Error state empty state
 */
export interface EmptyStateErrorProps extends EmptyStatePresetProps {
  errorMessage?: string;
  onRetry?: () => void;
}

export function EmptyStateError({
  errorMessage = "Something went wrong",
  onRetry,
  className,
}: EmptyStateErrorProps) {
  return (
    <EmptyState
      title="Unable to load content"
      description={errorMessage}
      icon={AlertCircle}
      primaryAction={
        onRetry
          ? {
              label: "Try again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Offline empty state
 */
export function EmptyStateOffline({ onRetry, className }: EmptyStateErrorProps) {
  return (
    <EmptyState
      title="You're offline"
      description="Check your internet connection and try again."
      icon={WifiOff}
      primaryAction={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * All caught up empty state - shown when feeds exist but no items match current view
 */
export function EmptyStateAllCaughtUp({ className }: EmptyStatePresetProps) {
  return (
    <EmptyState
      title="All caught up!"
      description="You've read everything in this view. Check back later for new content."
      icon={CheckCircle}
      className={className}
    />
  );
}
