import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-[2.5rem] bg-neutral-900/50 border border-white/5 flex items-center justify-center text-neutral-700 mb-6 group">
        <Icon className="w-10 h-10 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-500" />
      </div>
      
      <h3 className="text-lg font-black uppercase text-white tracking-widest italic mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-neutral-500 font-medium max-w-[200px] leading-relaxed mb-8">
          {description}
        </p>
      )}

      {action && (
        <button 
          onClick={action.onClick}
          className="bg-white text-black px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-xl"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
