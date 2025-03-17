'use client'

import { useEffect } from 'react'

export function SmoothScroll() {
  useEffect(() => {
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