import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface StoryItem {
  id: string;
  imageUrl: string;
  caption?: string;
  barberName?: string;
}

interface StoryViewerProps {
  items: StoryItem[];
  initialIndex?: number;
  onClose: () => void;
  onBookNow?: () => void;
}

export function StoryViewer({ items, initialIndex = 0, onClose, onBookNow }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const STORY_DURATION = 5000;

  const handleNext = useCallback(() => {
    const maxIndex = onBookNow ? items.length : items.length - 1;
    if (currentIndex < maxIndex) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, items.length, onClose, onBookNow]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (onBookNow && currentIndex === items.length) {
      // Pause on the end screen
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 1;
      });
    }, STORY_DURATION / 100);

    return () => clearInterval(interval);
  }, [currentIndex, handleNext, items.length, onBookNow]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!items || items.length === 0) return null;

  const isEndScreen = onBookNow && currentIndex === items.length;
  const currentItem = isEndScreen ? items[items.length - 1] : items[currentIndex];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col touch-none"
    >
      <div className="absolute top-0 inset-x-0 z-50 flex gap-1 p-2 pt-4">
        {items.map((_, idx) => (
          <div key={idx} className="h-0.5 md:h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
            <div 
              className="h-full bg-white transition-all ease-linear"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%',
                transitionDuration: idx === currentIndex ? `${STORY_DURATION / 100}ms` : '0ms'
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-6 inset-x-0 z-50 p-4 pt-8 flex items-center justify-between pointer-events-none">
         <div className="flex items-center gap-2 pointer-events-auto">
            {currentItem.barberName && (
              <span className="text-[10px] uppercase font-black tracking-widest text-white drop-shadow-md bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-md">
                By {currentItem.barberName}
              </span>
            )}
         </div>
         <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto active:scale-95 transition-transform">
           <X className="w-5 h-5" />
         </button>
      </div>

      <div className="absolute inset-0 z-40 flex">
        <div className="w-1/3 h-full" onClick={handlePrev} />
        <div className="w-2/3 h-full" onClick={handleNext} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full max-w-lg mx-auto flex flex-col items-center justify-center bg-black"
        >
          <img 
            src={currentItem.imageUrl} 
            alt={currentItem.caption || "Story"} 
            className={`w-full h-[85vh] object-cover rounded-3xl transition-all duration-500 ${isEndScreen ? 'blur-md brightness-50' : ''}`}
            referrerPolicy="no-referrer"
          />
          
          {isEndScreen ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 pointer-events-none">
              <p className="text-white font-black italic uppercase tracking-widest text-2xl text-center mb-8 drop-shadow-2xl">
                Gostou dos resultados?
              </p>
              <button 
                onClick={onBookNow}
                className="pointer-events-auto bg-amber-500 text-black px-10 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(250,204,21,0.4)]"
              >
                Agendar Agora
              </button>
            </div>
          ) : (
            <div className="absolute bottom-0 inset-x-0 p-8 pt-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none flex flex-col items-center text-center">
              {currentItem.caption && (
                <p className="text-white font-black italic uppercase tracking-widest text-sm drop-shadow-2xl px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl">{currentItem.caption}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
