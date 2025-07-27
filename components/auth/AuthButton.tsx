// ABOUTME: Authentication button component that shows login or user menu based on auth state
// ABOUTME: Handles feature flag switching between React Query auth and legacy auth

'use client'

import React, { useState } from 'react'
import { useAuthContext } from '@/components/providers/auth-provider'
import { UserMenu } from './UserMenu'
import { LoginForm } from './LoginForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LogIn, UserPlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Auth button props
 */
interface AuthButtonProps {
  /** Display variant */
  variant?: 'button' | 'popover' | 'modal'
  /** Button size */
  size?: 'sm' | 'default' | 'lg'
  /** Custom className */
  className?: string
  /** Show user name when authenticated */
  showUserName?: boolean
  /** Custom login text */
  loginText?: string
  /** Custom register text */
  registerText?: string
  /** Callback on successful auth */
  onAuthSuccess?: () => void
  /** Callback on logout */
  onLogout?: () => void
}

/**
 * Main authentication button component
 */
export function AuthButton({
  variant = 'button',
  size = 'default',
  className,
  showUserName = false,
  loginText = 'Sign in',
  registerText = 'Sign up',
  onAuthSuccess,
  onLogout
}: AuthButtonProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user,
    isReactQueryEnabled 
  } = useAuthContext()
  
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    setShowLogin(false)
    setShowRegister(false)
    
    if (onAuthSuccess) {
      onAuthSuccess()
    }
  }

  /**
   * Handle logout
   */
  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <Button 
        variant="ghost" 
        size={size} 
        disabled 
        className={cn("gap-2", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    )
  }

  // If React Query auth is disabled, show fallback
  if (!isReactQueryEnabled) {
    return (
      <Button 
        variant="outline" 
        size={size} 
        disabled 
        className={cn("gap-2", className)}
      >
        <LogIn className="h-4 w-4" />
        Auth Disabled
      </Button>
    )
  }

  // Show user menu if authenticated
  if (isAuthenticated && user) {
    return (
      <UserMenu 
        showName={showUserName}
        triggerClassName={className}
        onLogout={handleLogout}
      />
    )
  }

  // Show authentication options
  if (variant === 'modal') {
    return (
      <div className="flex items-center gap-2">
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogTrigger asChild>
            <Button variant="ghost" size={size} className={className}>
              <LogIn className="h-4 w-4 mr-2" />
              {loginText}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Welcome back</DialogTitle>
              <DialogDescription>
                Sign in to your account to continue
              </DialogDescription>
            </DialogHeader>
            <LoginForm
              onSuccess={handleAuthSuccess}
              showRegisterLink={false}
              className="border-0 shadow-none"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showRegister} onOpenChange={setShowRegister}>
          <DialogTrigger asChild>
            <Button size={size}>
              <UserPlus className="h-4 w-4 mr-2" />
              {registerText}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create account</DialogTitle>
              <DialogDescription>
                Sign up to get started with Digests
              </DialogDescription>
            </DialogHeader>
            {/* RegisterForm would go here */}
            <div className="p-4 text-center text-muted-foreground">
              Registration form coming soon
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (variant === 'popover') {
    return (
      <Popover open={showLogin} onOpenChange={setShowLogin}>
        <PopoverTrigger asChild>
          <Button variant="outline" size={size} className={className}>
            <LogIn className="h-4 w-4 mr-2" />
            {loginText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <LoginForm
            onSuccess={handleAuthSuccess}
            title="Sign in"
            description=""
            showRegisterLink={true}
            className="border-0 shadow-none"
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Default button variant
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size={size} 
        className={className}
        onClick={() => setShowLogin(true)}
      >
        <LogIn className="h-4 w-4 mr-2" />
        {loginText}
      </Button>

      <Button 
        size={size}
        onClick={() => setShowRegister(true)}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        {registerText}
      </Button>

      {/* Login Modal */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <LoginForm
            onSuccess={handleAuthSuccess}
            showRegisterLink={false}
            className="border-0 shadow-none"
          />
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>
              Sign up to get started with Digests
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground">
            Registration form coming soon
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Compact auth button for mobile/small spaces
 */
export function CompactAuthButton(props: Omit<AuthButtonProps, 'showUserName'>) {
  return (
    <AuthButton
      {...props}
      showUserName={false}
      variant="popover"
      size="sm"
    />
  )
}

/**
 * Auth status indicator
 */
export function AuthStatusBadge() {
  const { isAuthenticated, isLoading, user, error } = useAuthContext()

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        Connecting...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        Auth Error
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        Signed in as {user.name || user.email}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <div className="h-2 w-2 rounded-full bg-gray-400" />
      Not signed in
    </div>
  )
}