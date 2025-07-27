// ABOUTME: User menu component with authentication controls and user profile access
// ABOUTME: Provides logout, profile management, and user status display with React Query auth

'use client'

import React, { useState } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  CreditCard, 
  Bell,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/**
 * User menu props
 */
interface UserMenuProps {
  /** Show user name in trigger */
  showName?: boolean
  /** Show user email in menu */
  showEmail?: boolean
  /** Custom trigger className */
  triggerClassName?: string
  /** Show admin badge if user is admin */
  showAdminBadge?: boolean
  /** Custom logout callback */
  onLogout?: () => void
}

/**
 * User menu component
 */
export function UserMenu({
  showName = false,
  showEmail = true,
  triggerClassName,
  showAdminBadge = true,
  onLogout
}: UserMenuProps) {
  const { 
    user, 
    isAuthenticated, 
    logout, 
    isLoggingOut, 
    error 
  } = useAuthContext()
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout()
      setIsMenuOpen(false)
      
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  /**
   * Get user initials for avatar
   */
  const getUserInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    
    if (email) {
      return email[0].toUpperCase()
    }
    
    return 'U'
  }

  /**
   * Check if user is admin (placeholder logic)
   */
  const isAdmin = user?.email?.includes('admin') || false

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-9 w-auto rounded-full px-2 py-1",
            triggerClassName
          )}
          disabled={isLoggingOut}
        >
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7">
              <AvatarImage 
                src={user.picture} 
                alt={user.name || user.email}
              />
              <AvatarFallback className="text-xs">
                {getUserInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            
            {showName && user.name && (
              <span className="hidden md:inline-block text-sm font-medium truncate max-w-24">
                {user.name}
              </span>
            )}
            
            {isLoggingOut && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* User Info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {user.name || 'User'}
              </p>
              {showAdminBadge && isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            
            {showEmail && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            )}
            
            {/* Auth Status */}
            <div className="flex items-center gap-1 mt-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">
                Signed in
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Profile */}
        <DropdownMenuItem asChild>
          <Link href="/web/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        
        {/* Settings */}
        <DropdownMenuItem asChild>
          <Link href="/web/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        
        {/* Notifications */}
        <DropdownMenuItem asChild>
          <Link href="/web/notifications" className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>
        
        {/* Billing (if not admin) */}
        {!isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/web/billing" className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Error Display */}
        {error && (
          <>
            <DropdownMenuItem disabled className="text-destructive">
              <AlertCircle className="mr-2 h-4 w-4" />
              <span className="text-xs truncate">
                {error.message}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Logout */}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact user menu for mobile
 */
export function CompactUserMenu({ onLogout }: Pick<UserMenuProps, 'onLogout'>) {
  return (
    <UserMenu
      showName={false}
      showEmail={false}
      showAdminBadge={false}
      triggerClassName="h-8 w-8 p-0"
      onLogout={onLogout}
    />
  )
}

/**
 * User menu for sidebar navigation
 */
export function SidebarUserMenu({ onLogout }: Pick<UserMenuProps, 'onLogout'>) {
  return (
    <UserMenu
      showName={true}
      showEmail={true}
      showAdminBadge={true}
      triggerClassName="w-full justify-start h-10 px-3"
      onLogout={onLogout}
    />
  )
}

/**
 * Simple user avatar (no menu)
 */
interface UserAvatarProps {
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg'
  /** Custom className */
  className?: string
  /** Show online indicator */
  showStatus?: boolean
}

export function UserAvatar({ 
  size = 'md', 
  className,
  showStatus = false 
}: UserAvatarProps) {
  const { user, isAuthenticated } = useAuthContext()

  if (!isAuthenticated || !user) {
    return null
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const getUserInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    
    if (email) {
      return email[0].toUpperCase()
    }
    
    return 'U'
  }

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage 
          src={user.picture} 
          alt={user.name || user.email}
        />
        <AvatarFallback className="text-xs">
          {getUserInitials(user.name, user.email)}
        </AvatarFallback>
      </Avatar>
      
      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
      )}
    </div>
  )
}

/**
 * User greeting component
 */
export function UserGreeting() {
  const { user, isAuthenticated } = useAuthContext()

  if (!isAuthenticated || !user) {
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex items-center space-x-3 p-4 border-b">
      <UserAvatar size="lg" showStatus />
      <div>
        <p className="text-sm text-muted-foreground">
          {getGreeting()}
        </p>
        <p className="font-medium">
          {user.name || user.email}
        </p>
      </div>
    </div>
  )
}