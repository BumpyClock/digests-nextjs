"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import FocusLock from "react-focus-lock";

interface BaseModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  initialPosition: { x: number; y: number; width: number; height: number };
  className?: string;
}

export function BaseModal({
  id,
  isOpen,
  onClose,
  title,
  children,
  initialPosition,
  className = "",
}: BaseModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const animationDuration = 0.3; // seconds
  
  // Handle mounting for client-side portal
  useEffect(() => {
    setIsMounted(true);
    
    // Create portal container if it doesn't exist
    if (!document.getElementById("modal-portal")) {
      const div = document.createElement("div");
      div.id = "modal-portal";
      document.body.appendChild(div);
    }
    
    portalRef.current = document.getElementById("modal-portal") as HTMLDivElement;
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEscapeKey);
    
    // Block body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isMounted || !portalRef.current) {
    return null;
  }
  
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <FocusLock returnFocus>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: animationDuration * 0.8, 
              delay: animationDuration * 0.5 
            }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Modal container with shared layoutId for connected animation */}
          <motion.div
            layoutId={`feed-card-bg-${id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-title-${id}`}
            className={`fixed z-50 bg-card shadow-xl overflow-hidden ${className}`}
            style={{
              borderRadius: "40px",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: "90vw",
              maxHeight: "calc(100vh - 40px)"
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              duration: animationDuration
            }}
          >
            {/* Accessible hidden title */}
            <h2 id={`modal-title-${id}`} className="sr-only">
              {title}
            </h2>
            
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: animationDuration * 0.8 }}
              className="absolute right-4 top-4 z-[60] rounded-full bg-background/80 backdrop-blur-sm p-2 shadow-md"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </motion.button>
            
            {/* Modal content */}
            {children}
          </motion.div>
        </FocusLock>
      )}
    </AnimatePresence>,
    portalRef.current
  );
}