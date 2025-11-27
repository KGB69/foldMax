import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  onToggle: () => void;
}

export const CoreCenter: React.FC<Props> = ({ isActive, onToggle }) => {
  const center = 300;

  return (
    <g onClick={onToggle} className="cursor-pointer">
      {/* Interaction Zone */}
      <circle cx={center} cy={center} r="50" fill="transparent" />

      {/* Nucleus Membrane */}
      <motion.circle
        cx={center}
        cy={center}
        r={isActive ? 35 : 30}
        fill="url(#nucleusGradient)"
        mask="url(#nucleusMask)"
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{ duration: isActive ? 1 : 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: 'url(#bio-glow)' }}
        opacity="0.8"
      />

      {/* Nucleolus (Inner Dense Core) */}
      <motion.circle
         cx={center}
         cy={center}
         r={12}
         fill="#fff"
         animate={{ opacity: isActive ? [0.8, 1, 0.8] : 0.5 }}
         transition={{ duration: 2, repeat: Infinity }}
         style={{ filter: 'url(#bio-glow)' }}
      />

      {/* Floating Organelles inside nucleus */}
      {[...Array(5)].map((_, i) => (
         <motion.circle
            key={i}
            r={2 + Math.random() * 2}
            fill="#a855f7"
            initial={{ cx: center, cy: center }}
            animate={{ 
                cx: center + (Math.random() - 0.5) * 30,
                cy: center + (Math.random() - 0.5) * 30,
                opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, repeatType: "mirror" }}
         />
      ))}

      {/* Targeting Ring around Nucleus */}
      <motion.circle
        cx={center}
        cy={center}
        r="42"
        fill="none"
        stroke={isActive ? "#fff" : "#34d399"}
        strokeWidth="1.5"
        animate={{
          rotate: isActive ? 360 : 0,
          strokeDasharray: ["5 5", "20 5", "5 5"]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        opacity="0.6"
      />

      {/* Text Label */}
      <text
        x={center}
        y={center + 60}
        textAnchor="middle"
        fill="#06b6d4"
        fontSize="10"
        fontWeight="bold"
        className="pointer-events-none select-none font-mono tracking-widest"
        style={{ textShadow: '0 0 10px rgba(6,182,212,0.5)' }}
      >
        {isActive ? "ANALYZING..." : "NUCLEUS"}
      </text>
    </g>
  );
};