import React from 'react';
import { CoreCenter } from './CoreCenter';
import { InnerTechRing } from './InnerTechRing';
import { MiddleCircuitRing } from './MiddleCircuitRing';
import { OuterOrganicRing } from './OuterOrganicRing';

interface BioCoreProps {
  isActive: boolean;
  onToggle: () => void;
}

export const BioCore: React.FC<BioCoreProps> = ({ isActive, onToggle }) => {
  return (
    <div className="relative w-[600px] h-[600px] flex items-center justify-center">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full overflow-visible"
        style={{ filter: isActive ? 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))' : 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.1))' }}
      >
        <defs>
          <linearGradient id="bioGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" /> {/* Emerald 400 */}
            <stop offset="50%" stopColor="#22d3ee" /> {/* Cyan 400 */}
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          
          <linearGradient id="nucleusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" /> {/* Pink 500 */}
            <stop offset="100%" stopColor="#a855f7" /> {/* Purple 500 */}
          </linearGradient>

          <filter id="bio-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Layer 1: DNA Helix Ring */}
        <g className="origin-center">
           <OuterOrganicRing isActive={isActive} />
        </g>

        {/* Layer 2: Genomic Data Ring */}
        <g className="origin-center">
          <MiddleCircuitRing isActive={isActive} />
        </g>

        {/* Layer 3: Microscope Aperture */}
        <g className="origin-center">
          <InnerTechRing isActive={isActive} />
        </g>

        {/* Layer 4: Cell Nucleus */}
        <CoreCenter isActive={isActive} onToggle={onToggle} />

      </svg>
    </div>
  );
};