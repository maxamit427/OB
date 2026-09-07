import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Move, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

interface SizePreset {
  label: string;
  w: number;
  h: number;
}

interface Props {
  src: string;
  aspectRatio?: number;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}

const PRESETS: SizePreset[] = [
  { label: "Square 400 × 400", w: 400, h: 400 },
  { label: "Portrait 400 × 500", w: 400, h: 500 },
  { label: "Banner 800 × 400", w: 800, h: 400 },
  { label: "Original crop", w: 0, h: 0 },
];

type Point = { x: number; y: number };

export default function ImageCropper({ src, aspectRatio = 1, onCrop, onCancel }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ start: Point; pan: Point } | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [activeAR, setActiveAR] = useState(aspectRatio || 1);
  const [output, setOutput] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const updateSize = () => setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeAR]);

  const resetPosition = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    setLoaded(true);
    resetPosition();
  };

  const applyPreset = (preset: SizePreset) => {
    setOutput({ width: preset.w, height: preset.h });
    setActiveAR(preset.w && preset.h ? preset.w / preset.h : aspectRatio || 1);
    resetPosition();
    setShowCustom(false);
  };

  const applyCustom = () => {
    const width = Number.parseInt(customW, 10);
    const height = Number.parseInt(customH, 10);
    if (!width || !height || width < 32 || height < 32) return;
    setOutput({ width, height });
    setActiveAR(width / height);
    resetPosition();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      start: { x: event.clientX, y: event.clientY },
      pan,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const imageScale = getImageScale();
    const maxX = Math.max(0, (naturalSize.width * imageScale - viewportSize.width) / 2);
    const maxY = Math.max(0, (naturalSize.height * imageScale - viewportSize.height) / 2);
    const nextX = dragRef.current.pan.x + event.clientX - dragRef.current.start.x;
    const nextY = dragRef.current.pan.y + event.clientY - dragRef.current.start.y;
    setPan({
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!image || !canvas || !viewport || !loaded || !naturalSize.width) return;

    const view = viewport.getBoundingClientRect();
    const baseScale = Math.max(view.width / naturalSize.width, view.height / naturalSize.height);
    const scale = baseScale * zoom;
    const imageWidth = naturalSize.width * scale;
    const imageHeight = naturalSize.height * scale;
    const imageLeft = (view.width - imageWidth) / 2 + pan.x;
    const imageTop = (view.height - imageHeight) / 2 + pan.y;
    const sourceX = Math.max(0, Math.min(naturalSize.width, -imageLeft / scale));
    const sourceY = Math.max(0, Math.min(naturalSize.height, -imageTop / scale));
    const sourceWidth = Math.min(naturalSize.width - sourceX, view.width / scale);
    const sourceHeight = Math.min(naturalSize.height - sourceY, view.height / scale);
    const rawWidth = output.width || Math.max(1, Math.round(sourceWidth));
    const rawHeight = output.height || Math.max(1, Math.round(sourceHeight));
    const quarterTurn = rotation % 180 !== 0;
    const finalWidth = quarterTurn ? rawHeight : rawWidth;
    const finalHeight = quarterTurn ? rawWidth : rawHeight;

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, finalWidth, finalHeight);
    if (rotation) {
      context.save();
      context.translate(finalWidth / 2, finalHeight / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -rawWidth / 2,
        -rawHeight / 2,
        rawWidth,
        rawHeight,
      );
      context.restore();
    } else {
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalWidth, finalHeight);
    }

    onCrop(canvas.toDataURL("image/jpeg", 0.92));
  };

  const getImageScale = () => {
    if (!naturalSize.width || !naturalSize.height || !viewportSize.width || !viewportSize.height) return 1;
    return Math.max(viewportSize.width / naturalSize.width, viewportSize.height / naturalSize.height) * zoom;
  };

  useEffect(() => {
    setActiveAR(aspectRatio || 1);
    setOutput({ width: 0, height: 0 });
    resetPosition();
  }, [aspectRatio, resetPosition, src]);

  const activePreset = PRESETS.find(p => p.w === output.width && p.h === output.height)?.label;
  const viewportStyle = { aspectRatio: `${activeAR}` };
  const imageScale = getImageScale();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(2, 4, 12, 0.82)" }}
        onClick={onCancel}
      />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ background: "#0e101b", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Move size={15} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Profile image</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Position your photo
            </h3>
            <p className="mt-1 text-xs text-white/45">Drag to move, use the slider to zoom, then save the exact frame you want.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close image cropper"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            <div
              ref={viewportRef}
              className="relative mx-auto w-full max-w-[520px] touch-none select-none overflow-hidden rounded-2xl"
              style={{ ...viewportStyle, background: "linear-gradient(45deg, #151827 25%, transparent 25%), linear-gradient(-45deg, #151827 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #151827 75%), linear-gradient(-45deg, transparent 75%, #151827 75%), #0a0c15", backgroundSize: "24px 24px", backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0", border: "1px solid rgba(6,182,212,0.32)" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={resetPosition}
            >
              <img
                ref={imageRef}
                src={src}
                alt="Image to crop"
                onLoad={handleLoad}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: naturalSize.width ? naturalSize.width * imageScale / zoom : "100%",
                  height: naturalSize.height ? naturalSize.height * imageScale / zoom : "100%",
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 60px rgba(0,0,0,0.25)" }} />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/15" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/15" />
              {!loaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">Loading image…</div>}
            </div>
            <p className="mt-3 text-center text-[11px] text-white/35">The frame above is exactly what will be saved.</p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">Output shape</p>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                {PRESETS.map(preset => {
                  const active = activePreset === preset.label || (!activePreset && preset.w === 0);
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className="rounded-xl px-3 py-2 text-left text-xs transition-colors"
                      style={active
                        ? { background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.42)", color: "#67e8f9" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.58)" }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowCustom(value => !value)}
                className="text-xs text-violet-300 transition-colors hover:text-violet-200"
              >
                {showCustom ? "Hide custom size" : "Use custom output size"}
              </button>
              {showCustom && (
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <input value={customW} onChange={e => setCustomW(e.target.value)} type="number" min="32" placeholder="Width" className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none" />
                  <span className="text-white/30">×</span>
                  <input value={customH} onChange={e => setCustomH(e.target.value)} type="number" min="32" placeholder="Height" className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none" />
                  <button type="button" onClick={applyCustom} className="rounded-lg bg-violet-600 px-2.5 py-2 text-xs font-semibold text-white">Apply</button>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs text-white/50">
                <ZoomOut size={14} />
                <input aria-label="Zoom image" type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="mx-3 flex-1 accent-cyan-400" />
                <ZoomIn size={14} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Zoom {Math.round(zoom * 100)}%</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRotation(value => (value + 90) % 360)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"><RotateCw size={12} /> Rotate</button>
                  <button type="button" onClick={resetPosition} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white">Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={!loaded} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="inline-flex items-center gap-2"><Check size={15} /> Save photo</span>
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}