import React from "react";
import { motion } from "motion/react";

export function BrandLogo({ className = "w-10 h-10", iconSize = "w-6 h-6" }: { className?: string, iconSize?: string }) {
  return (
    <div className={`relative ${className} rounded-xl overflow-hidden group/logo`}>
      {/* Animated Golden Ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-1 z-0 bg-[conic-gradient(from_0deg,transparent_25%,#f59e0b_50%,transparent_75%)] opacity-80"
      />
      
      {/* Inner Container to hold the image */}
      <div className="absolute inset-[2px] z-10 bg-black rounded-[10px] flex items-center justify-center overflow-hidden transition-all group-hover/logo:inset-[1px]">
        <img 
          src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
          alt="MS Logo" 
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
