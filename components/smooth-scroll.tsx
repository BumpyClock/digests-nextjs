'use client'

import { useEffect } from 'react'

/**
 * SmoothScroll component handles smooth scrolling behavior for anchor links within the same page.
 * It provides two main functionalities:
 * 1. Smooth scrolling when clicking on anchor links
 * 2. Automatic smooth scrolling to the target element when the page loads with a hash in the URL
 * 
 * @component
 * @example
 * ```tsx
 * <SmoothScroll />
 * ```
 */
export function SmoothScroll() {
  useEffect(() => {
    /**
     * Handles click events on anchor links to enable smooth scrolling
     * @param {MouseEvent} e - The click event object
     */
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      
      if (anchor?.hash && anchor.origin + anchor.pathname === window.location.origin + window.location.pathname) {
        e.preventDefault()
        const targetId = anchor.hash.slice(1)
        const element = document.getElementById(targetId)
        
        if (element) {
          // Update URL without triggering scroll
          window.history.pushState({}, '', anchor.hash)
          
          // Smooth scroll to element
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      }
    }

    /**
     * Handles initial page load with hash in URL to enable smooth scrolling to target element
     */
    const handleInitialScroll = () => {
      const hash = window.location.hash
      if (hash) {
        const targetId = hash.slice(1)
        const element = document.getElementById(targetId)
        if (element) {
          // Small delay to ensure proper scrolling after page load
          setTimeout(() => {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })
          }, 100)
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    // Handle initial load with hash
    handleInitialScroll()

    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return null
} 