import React from "react";

export function BrandLogo({ className = "w-10 h-10", iconSize = "w-6 h-6" }: { className?: string, iconSize?: string }) {
  return (
    <div className={`${className} rounded-xl flex items-center justify-center overflow-hidden transition-all`}>
      <img 
        src="/logo.png" 
        alt="MS Logo" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const container = e.currentTarget.parentElement;
          if (container && !container.querySelector('svg')) {
            container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scissors text-black ${iconSize}"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
          }
        }}
      />
    </div>
  );
}
