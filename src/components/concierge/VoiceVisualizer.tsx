'use client';

import React from 'react';

interface VoiceVisualizerProps {
  volume: number;
  isActive: boolean;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ volume, isActive }) => {
  // Create 20 bars for the visualizer
  const bars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full">
      {bars.map((i) => {
        // Calculate height based on volume and position
        const position = i / bars.length;
        const center = 0.5;
        const distanceFromCenter = Math.abs(position - center);
        const baseHeight = 4;
        const volumeMultiplier = isActive ? volume * 100 : 0;
        const height = baseHeight + (volumeMultiplier * (1 - distanceFromCenter * 2));

        return (
          <div
            key={i}
            className="w-1 bg-red-600 rounded-full transition-all duration-75"
            style={{
              height: `${Math.min(48, Math.max(4, height))}px`,
              opacity: isActive ? 1 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceVisualizer;
