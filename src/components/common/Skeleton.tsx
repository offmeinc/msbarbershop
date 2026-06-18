import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = "", variant = 'rectangular' }: SkeletonProps) {
  const baseClass = "bg-neutral-800/50 relative overflow-hidden";
  
  const variantClasses = {
    text: "h-3 w-3/4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl"
  };

  return (
    <div className={`${baseClass} ${variantClasses[variant]} ${className}`}>
      {/* Shine effect animation */}
      <motion.div
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
      />
    </div>
  );
}
