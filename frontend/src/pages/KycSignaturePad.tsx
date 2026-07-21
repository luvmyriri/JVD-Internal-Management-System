import { useState } from 'react';

// ==========================================
// DETACHED SIGNATURE CANVAS COMPONENT
// ==========================================
export default function KycSignaturePad({ onCanvasRef }: { onCanvasRef: (canvas: HTMLCanvasElement | null) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // dark slate pen

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = document.querySelector('canvas.cursor-crosshair') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Draw Electronic Signature Below</label>
      <div className="relative border border-slate-800 bg-white rounded-xl overflow-hidden shadow-inner h-28">
        <canvas
          ref={(el) => {
            onCanvasRef(el);
            if (el) {
              const ctx = el.getContext('2d');
              if (ctx && ctx.fillStyle !== '#ffffff') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, el.width, el.height);
              }
            }
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full cursor-crosshair block"
          width="480"
          height="112"
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-[10px] text-slate-500">Sign inside the boundary with mouse, stylus, or touch.</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] text-red-400 hover:text-red-300 font-bold tracking-wide uppercase transition"
        >
          Reset Pen Signature
        </button>
      </div>
    </div>
  );
}
