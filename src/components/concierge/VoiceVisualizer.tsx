import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let currentHeight = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Smooth visualizer movement
      const targetHeight = isActive ? Math.max(10, volume * 150) : 2;
      currentHeight += (targetHeight - currentHeight) * 0.2;

      // Draw bars
      const bars = 5;
      const spacing = 12;
      const maxBarHeight = 100;
      
      ctx.fillStyle = isActive ? '#ef4444' : '#475569'; // Red-500 if active, Slate-600 if idle
      
      for (let i = -2; i <= 2; i++) {
        const height = Math.min(maxBarHeight, currentHeight * (1 - Math.abs(i) * 0.2));
        const x = centerX + i * spacing - 2;
        const y = centerY - height / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, 4, height, 4);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={120} 
      className="w-full h-full"
    />
  );
};
