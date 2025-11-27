import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
}

export const InnerTechRing: React.FC<Props> = ({ isActive }) => {
  const center = 300;
  const radius = 110;

  return (
    <motion.g
      className="origin-center"
    >
      {/* Static Lens Housing */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#0e7490" strokeWidth="1" strokeOpacity="0.5" />
      
      {/* Rotating Aperture Blades */}
      <motion.g 
         animate={{ rotate: isActive ? 180 : 0, scale: isActive ? 0.9 : 1 }}
         transition={{ duration: 0.8, ease: "easeInOut" }}
         className="origin-center"
      >
        {[0, 60, 120, 180, 240, 300].map((angle) => (
           <path
             key={angle}
             transform={`rotate(${angle} ${center} ${center})`}
             d={`M ${center + radius} ${center} Q ${center + radius/2} ${center + 20} ${center + 40} ${center}`}
             fill="none"
             stroke="#22d3ee"
             strokeWidth="1.5"
             opacity="0.6"
           />
        ))}
      </motion.g>

      {/* Focus Reticle */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="origin-center"
      >
        {[0, 90, 180, 270].map((rot) => (
          <g key={rot} transform={`rotate(${rot} ${center} ${center})`}>
             <line x1={center} y1={center - radius + 10} x2={center} y2={center - radius + 25} stroke="#34d399" strokeWidth="2" />
             <line x1={center - 5} y1={center - radius + 10} x2={center + 5} y2={center - radius + 10} stroke="#34d399" strokeWidth="2" />
          </g>
        ))}
      </motion.g>
      
      {/* Bio-Hazard / Warning Symbols */}
      <motion.circle
        cx={center} cy={center} r={radius - 15}
        fill="none"
        stroke="#ec4899"
        strokeWidth="1"
        strokeDasharray="4 4"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
    </motion.g>
  );
};