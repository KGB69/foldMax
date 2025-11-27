import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
}

export const OuterOrganicRing: React.FC<Props> = ({ isActive }) => {
  const center = 300;
  const radius = 250;
  const amplitude = 15;
  const twists = 12;

  // Generate DNA Helix Paths
  const { strandA, strandB, connectors } = useMemo(() => {
    let pathA = "";
    let pathB = "";
    let lines = [];
    
    const steps = 360;
    
    for (let i = 0; i <= steps; i+=1) {
      const angleRad = (i * Math.PI) / 180;
      
      // Strand A calculation
      const rA = radius + amplitude * Math.sin(twists * angleRad);
      const xA = center + rA * Math.cos(angleRad);
      const yA = center + rA * Math.sin(angleRad);
      
      // Strand B calculation (Phase shifted by PI)
      const rB = radius + amplitude * Math.sin(twists * angleRad + Math.PI);
      const xB = center + rB * Math.cos(angleRad);
      const yB = center + rB * Math.sin(angleRad);

      const cmd = i === 0 ? "M" : "L";
      pathA += `${cmd} ${xA} ${yA} `;
      pathB += `${cmd} ${xB} ${yB} `;

      // Add connectors (base pairs) every few degrees
      if (i % 6 === 0) {
        lines.push(
          <line 
            key={i} 
            x1={xA} y1={yA} 
            x2={xB} y2={yB} 
            stroke="#10b981" 
            strokeWidth="0.5" 
            opacity="0.4"
          />
        );
      }
    }
    
    return { strandA: pathA, strandB: pathB, connectors: lines };
  }, [center, radius, amplitude, twists]);

  return (
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: isActive ? 60 : 120, repeat: Infinity, ease: "linear" }}
      className="origin-center"
    >
      {/* Outer boundary circles for context */}
      <circle cx={center} cy={center} r={radius + 30} stroke="#06b6d4" strokeWidth="1" fill="none" opacity="0.1" strokeDasharray="4 4"/>
      <circle cx={center} cy={center} r={radius - 30} stroke="#06b6d4" strokeWidth="1" fill="none" opacity="0.1" />

      {/* Base Pairs */}
      <g>{connectors}</g>

      {/* DNA Strands */}
      <motion.path
        d={strandA}
        fill="none"
        stroke="url(#bioGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: 'url(#bio-glow)' }}
      />
      <motion.path
        d={strandB}
        fill="none"
        stroke="#059669" // Darker Emerald
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Animated Particles flowing along the DNA */}
       <motion.circle r="3" fill="#fff" filter="url(#bio-glow)">
          <animateMotion 
             dur="10s" 
             repeatCount="indefinite" 
             path={strandA}
          />
       </motion.circle>
       <motion.circle r="3" fill="#34d399" filter="url(#bio-glow)">
          <animateMotion 
             dur="10s" 
             begin="5s"
             repeatCount="indefinite" 
             path={strandB}
          />
       </motion.circle>
    </motion.g>
  );
};