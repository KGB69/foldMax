import React, { useState } from 'react';
import { BioCore } from './components/BioCore';

export default function App() {
  const [isActive, setIsActive] = useState(false);

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-[#02040a] overflow-hidden selection:bg-emerald-500/30">
      {/* Background - Bio-Informatics Hexagonal Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <svg width="100%" height="100%" className="transition-opacity duration-1000">
           <defs>
             <pattern id="hex-grid" width="60" height="52" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
               <path d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3"/>
               <circle cx="30" cy="34.6" r="2" fill="#06b6d4" opacity="0.4" />
             </pattern>
           </defs>
           <rect width="100%" height="100%" fill="url(#hex-grid)" />
           {/* Vignette */}
           <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="#02040a" />
           </radialGradient>
           <rect width="100%" height="100%" fill="url(#vignette)" />
        </svg>
      </div>

      {/* Main Core Component */}
      <div className="relative z-10 scale-75 md:scale-100 transition-transform duration-700 ease-out">
        <BioCore isActive={isActive} onToggle={toggleActive} />
      </div>
      
      {/* Ambient Bio-Luminescence */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-50' : 'opacity-10'}`}>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[80px] rounded-full mix-blend-screen animate-pulse" />
      </div>
    </div>
  );
}