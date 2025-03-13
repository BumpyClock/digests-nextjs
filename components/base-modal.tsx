"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BaseModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  link?: string;
  title: string;
  children: React.ReactNode;
  initialPosition: { x: number; y: number; width: number; height: number };
  className?: string;
  overlayClassName?: string;
}

export function BaseModal({
  id,
  isOpen,
  onClose,
  title,
  children,
  initialPosition,
  className = "",
  overlayClassName = "",
}: BaseModalProps) {
  const [open, setOpen] = useState(false);
  const animationDuration = 0.3; // in seconds, matches our transition duration

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    // Delay the onClose callback to allow exit animations to complete
    setTimeout(() => {
      onClose();
    }, animationDuration * 1000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open && (
          <>
            {/* Delayed overlay animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: animationDuration * 0.8, 
                delay: animationDuration * 0.5 // Delay the overlay animation
              }}
              className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm ${overlayClassName} `}
              onClick={handleClose}
            />
            
            {/* Background animation container - shares layoutId with card */}
            <motion.div 
              layoutId={`feed-card-bg-${id}`}
              className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-6xl max-h-[calc(100vh-40px)] rounded-[40px] sm:rounded-[40px] border-none bg-card shadow-xl overflow-hidden`}
              transition={{ 
                type: "spring",
                damping: 30,
                stiffness: 300,
                duration: animationDuration
              }}
            >
              <DialogContent
                id={`modal-${id}`}
                className={`p-0 gap-0 border-none shadow-none  max-w-6xl max-h-[calc(100vh-40px)] overflow-hidden ${className}`}
                hideCloseButton={true}
                overlayClassName="opacity-0" // Hide the default overlay
              >
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: animationDuration * 0.8 }}
                  className="absolute right-4 top-4 z-[60] rounded-full bg-background/80 backdrop-blur-sm p-2 shadow-md"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </motion.button>
                
                {children}
              </DialogContent>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Dialog>
  );
}