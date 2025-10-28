import React, { useRef, useEffect } from 'react';

interface BenchmarkDataPoint {
  iteration: number;
  timeMs: number;
  avgTimeMs: number;
}

interface BenchmarkGraphProps {
  data: BenchmarkDataPoint[];
  libraryName: string;
  color: string;
  maxIterations: number;
  isActive: boolean;
}

export const BenchmarkGraph: React.FC<BenchmarkGraphProps> = ({
  data,
  libraryName,
  color,
  maxIterations,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const maxTime = Math.max(...data.map((d) => d.timeMs), 10);
    const minTime = Math.min(...data.map((d) => d.timeMs), 0);
    const timeRange = maxTime - minTime || 1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(padding.left, padding.top, graphWidth, graphHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + graphWidth, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, graphWidth, graphHeight);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const timeValue = maxTime - (timeRange / 5) * i;
      const y = padding.top + (graphHeight / 5) * i;
      ctx.fillText(`${timeValue.toFixed(1)}ms`, padding.left - 5, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, height - 10);
    ctx.fillText(`${maxIterations}`, padding.left + graphWidth, height - 10);
    ctx.fillText(`${Math.floor(maxIterations / 2)}`, padding.left + graphWidth / 2, height - 10);

    if (data.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color + 'ff');
      gradient.addColorStop(1, color + '80');

      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding.left + (point.iteration / maxIterations) * graphWidth;
        const normalizedTime = (point.timeMs - minTime) / timeRange;
        const y = padding.top + graphHeight - normalizedTime * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      const lastDataPoint = data[data.length - 1];
      if (lastDataPoint) {
        ctx.lineTo(
          padding.left + (lastDataPoint.iteration / maxIterations) * graphWidth,
          padding.top + graphHeight
        );
      }
      ctx.lineTo(padding.left, padding.top + graphHeight);
      ctx.closePath();

      const fillGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight);
      fillGradient.addColorStop(0, color + '40');
      fillGradient.addColorStop(1, color + '10');
      ctx.fillStyle = fillGradient;
      ctx.fill();

      if (data.length > 0 && isActive) {
        const lastPoint = data[data.length - 1];
        if (lastPoint) {
          const x = padding.left + (lastPoint.iteration / maxIterations) * graphWidth;
          const normalizedTime = (lastPoint.timeMs - minTime) / timeRange;
          const y = padding.top + graphHeight - normalizedTime * graphHeight;

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = color + '60';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    if (data.length > 5) {
      const avgData = data.slice(-20);
      ctx.beginPath();
      avgData.forEach((point, index) => {
        const x = padding.left + (point.iteration / maxIterations) * graphWidth;
        const normalizedTime = (point.avgTimeMs - minTime) / timeRange;
        const y = padding.top + graphHeight - normalizedTime * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, color, maxIterations, isActive]);

  return (
    <div className="BenchmarkGraph">
      <div className="BenchmarkGraph__header">
        <div className="BenchmarkGraph__title" style={{ color }}>
          {libraryName}
        </div>
        {data.length > 0 && data[data.length - 1] && (
          <div className="BenchmarkGraph__stats">
            <span className="BenchmarkGraph__stat">
              Iterations: <strong>{data.length}</strong>
            </span>
            <span className="BenchmarkGraph__stat">
              Current: <strong>{data[data.length - 1]?.timeMs.toFixed(2)}ms</strong>
            </span>
            <span className="BenchmarkGraph__stat">
              Avg: <strong>{data[data.length - 1]?.avgTimeMs.toFixed(2)}ms</strong>
            </span>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} width={800} height={200} className="BenchmarkGraph__canvas" />
    </div>
  );
};
