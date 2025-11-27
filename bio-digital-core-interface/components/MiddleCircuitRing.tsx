import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
}

export const MiddleCircuitRing: React.FC<Props> = ({ isActive }) => {
  const center = 300;
  const radius = 190;
  const numBars = 60;
  
  // Generate radial bars representing gene sequence data
  const bars = Array.from({ length: numBars }).map((_, i) => {
    const angle = (i * 360) / numBars;
    const isLong = i % 5 === 0;
    const isMedium = i % 3 === 0;
    const length = isLong ? 40 : isMedium ? 25 : 10;
    
    return (
      <motion.line
        key={i}
        x1={center + radius * Math.cos((angle * Math.PI) / 180)}
        y1={center + radius * Math.sin((angle * Math.PI) / 180)}
        x2={center + (radius - length) * Math.cos((angle * Math.PI) / 180)}
        y2={center + (radius - length) * Math.sin((angle * Math.PI) / 180)}
        stroke={isLong ? "#00f3ff" : "#10b981"}
        strokeWidth={isLong ? 3 : 1}
        opacity={isLong ? 1 : 0.5}
        initial={{ strokeDasharray: "100 0" }}
        animate={{ 
          opacity: isActive ? [0.3, 1, 0.3] : 0.5,
          stroke: isActive && isLong ? "#22d3ee" : isLong ? "#0e7490" : "#059669"
        }}
        transition={{ 
          duration: 2, 
          delay: i * 0.05, 
          repeat: Infinity,
          repeatType: "reverse" 
        }}
      />
    );
  });

  return (
    <motion.g
      animate={{ rotate: -360 }}
      transition={{ duration: isActive ? 80 : 160, repeat: Infinity, ease: "linear" }}
      className="origin-center"
    >
      {/* Background Track */}
      <circle cx={center} cy={center} r={radius - 20} fill="none" stroke="#1e293b" strokeWidth="40" strokeOpacity="0.2" />
      
      {/* Sequencing Bars */}
      {bars}
      
      {/* Scanning Head */}
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="origin-center">
        <path
           d={`M ${center} ${center - radius - 10} L ${center} ${center - radius + 50}`}
           stroke="#ec4899"
           strokeWidth="2"
           style={{ filter: 'url(#bio-glow)' }}
        />
      </motion.g>

      {/* Decorative Text Rings */}
       <path
        id="textCurve"
        d={`M ${center - radius + 55}, ${center} a ${radius - 55},${radius - 55} 0 1,1 ${2 * (radius - 55)},0 a ${radius - 55},${radius - 55} 0 1,1 -${2 * (radius - 55)},0`}
        fill="none"
      />
      <text fontSize="10" fill="#06b6d4" letterSpacing="4" opacity="0.6" className="font-mono">
        <textPath href="#textCurve" startOffset="0%">
          GENOMIC SEQUENCE ANALYSIS // MT-DNA // HAPLOGROUP TARGET //
        </textPath>
      </text>

    </motion.g>
  );
};