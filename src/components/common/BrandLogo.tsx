import React from "react";

export function BrandLogo({ className = "w-10 h-10", iconSize = "w-6 h-6" }: { className?: string, iconSize?: string }) {
  return (
    <div className={`${className} rounded-xl flex items-center justify-center overflow-hidden transition-all border border-white/5`}>
      <img 
        src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
        alt="MS Logo" 
        className="w-full h-full object-cover scale-110"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
