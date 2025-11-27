import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Wifi, Shield } from 'lucide-react';

interface Props {
  isActive: boolean;
}

export const InterfaceOverlay: React.FC<Props> = ({ isActive }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Left Stats */}
      <div className="absolute top-8 left-8 md:top-12 md:left-12 flex flex-col gap-4 text-cyan-400">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 border border-cyan-500/30 rounded bg-cyan-950/20 backdrop-blur-sm">
            <Activity size={24} className={isActive ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="text-xs text-cyan-600 font-display">SYSTEM STATUS</div>
            <div className="text-xl font-bold tracking-widest">{isActive ? "OPTIMAL" : "STANDBY"}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3"
        >
           <div className="p-2 border border-cyan-500/30 rounded bg-cyan-950/20 backdrop-blur-sm">
            <Cpu size={24} className={isActive ? "animate-spin-slow" : ""} />
          </div>
          <div>
            <div className="text-xs text-cyan-600 font-display">CORE LOAD</div>
            <div className="text-xl font-bold tracking-widest font-mono">
              {isActive ? "98.4%" : "12.0%"}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Right Info */}
      <div className="absolute top-8 right-8 md:top-12 md:right-12 text-right">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-cyan-500 font-mono text-sm"
        >
          SECURE CONNECTION
          <Wifi className={`inline ml-2 ${isActive ? "text-green-400" : "text-gray-600"}`} size={16} />
        </motion.div>
        <div className="mt-2 h-1 w-32 bg-gray-800 ml-auto rounded overflow-hidden">
          <motion.div 
            className="h-full bg-cyan-400"
            animate={{ width: isActive ? "100%" : "30%" }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Bottom Center */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-8 py-2 rounded-full border border-opacity-50 font-display tracking-[0.2em] transition-all duration-300 pointer-events-auto backdrop-blur-md ${
            isActive 
              ? "bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
              : "bg-cyan-500/10 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          }`}
          onClick={() => {
            // This is just a visual button, the main interaction is on the core, but this helps UX
            document.querySelector('svg g')?.dispatchEvent(new Event('click', { bubbles: true }));
          }}
        >
          {isActive ? "TERMINATE LINK" : "INITIALIZE SCAN"}
        </motion.button>
      </div>
      
      {/* Decorative Corners */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="cyan" strokeWidth="0.5" strokeOpacity="0.2"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#mask)" />
        <path d="M 40 40 L 100 40 L 100 45 L 45 45 L 45 100 L 40 100 Z" fill="#00f3ff" />
        <path d="M calc(100% - 40px) 40 L calc(100% - 100px) 40 L calc(100% - 100px) 45 L calc(100% - 45px) 45 L calc(100% - 45px) 100 L calc(100% - 40px) 100 Z" fill="#00f3ff" />
        <path d="M 40 calc(100% - 40px) L 100 calc(100% - 40px) L 100 calc(100% - 45px) L 45 calc(100% - 45px) L 45 calc(100% - 100px) L 40 calc(100% - 100px) Z" fill="#00f3ff" />
        <path d="M calc(100% - 40px) calc(100% - 40px) L calc(100% - 100px) calc(100% - 40px) L calc(100% - 100px) calc(100% - 45px) L calc(100% - 45px) calc(100% - 45px) L calc(100% - 45px) calc(100% - 100px) L calc(100% - 40px) calc(100% - 100px) Z" fill="#00f3ff" />
      </svg>
    </div>
  );
};