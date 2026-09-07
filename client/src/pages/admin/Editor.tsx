import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Upload, Type, Image as ImageIcon, Download, RotateCcw, RotateCw,
  Trash2, Layers, Move, ZoomIn, ZoomOut, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Plus, Eye, EyeOff, ChevronUp, ChevronDown,
  Sliders, Wand2, Maximize2, Square, Circle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FONTS = ["Space Grotesk", "Inter", "Rajdhani", "monospace", "serif", "Arial", "Impact"];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];
const BLEND_MODES = ["normal", "screen", "overlay", "multiply", "lighten", "color-dodge"];
const EFFECTS = [
  { id: "none", label: "None" },
  { id: "neon-cyan", label: "Neon Cyan" },
  { id: "neon-purple", label: "Neon Purple" },
  { id: "neon-pink", label: "Neon Pink" },
  { id: "neon-green", label: "Neon Green" },
  { id: "fire", label: "Fire Glow" },
  { id: "shadow", label: "Deep Shadow" },
];

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  effect: string;
  opacity: number;
  rotation: number;
  visible: boolean;
  blendMode: string;
  letterSpacing: number;
}

function getTextShadow(effect: string) {
  switch (effect) {
    case "neon-cyan":    return "0 0 8px #06b6d4, 0 0 20px #06b6d4, 0 0 40px #06b6d4";
    case "neon-purple":  return "0 0 8px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7";
    case "neon-pink":    return "0 0 8px #ec4899, 0 0 20px #ec4899, 0 0 40px #ec4899";
    case "neon-green":   return "0 0 8px #22c55e, 0 0 20px #22c55e, 0 0 40px #22c55e";
    case "fire":         return "0 0 10px #f97316, 0 0 25px #ef4444, 0 0 50px #dc2626";
    case "shadow":       return "4px 4px 0 #000, 6px 6px 20px rgba(0,0,0,0.8)";
    default:             return "none";
  }
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function Editor() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgImageNatural, setBgImageNatural] = useState<{ w: number; h: number }>({ w: 1200, h: 800 });
  const [canvasW, setCanvasW] = useState(1200);
  const [canvasH, setCanvasH] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<TextLayer[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"layers" | "text" | "canvas">("text");
  const [bgColor, setBgColor] = useState("#050810");
  const [showGrid, setShowGrid] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png");
  const [exporting, setExporting] = useState(false);

  const selectedLayer = layers.find(l => l.id === selectedId);

  function pushHistory(newLayers: TextLayer[]) {
    const trimmed = history.slice(0, historyIdx + 1);
    const next = [...trimmed, newLayers];
    setHistory(next.length > 50 ? next.slice(next.length - 50) : next);
    setHistoryIdx(Math.min(next.length - 1, 49));
  }

  function undo() {
    if (historyIdx <= 0) return;
    const prev = historyIdx - 1;
    setLayers(history[prev]);
    setHistoryIdx(prev);
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const next = historyIdx + 1;
    setLayers(history[next]);
    setHistoryIdx(next);
  }

  function updateLayers(newLayers: TextLayer[]) {
    setLayers(newLayers);
    pushHistory(newLayers);
  }

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...patch } : l);
    setLayers(newLayers);
    pushHistory(newLayers);
  }

  function addTextLayer() {
    const newLayer: TextLayer = {
      id: generateId(),
      text: "NEW TEXT",
      x: canvasW / 2 - 80,
      y: canvasH / 2 - 20,
      fontSize: 32,
      fontFamily: "Space Grotesk",
      color: "#06b6d4",
      bold: false,
      italic: false,
      align: "center",
      effect: "neon-cyan",
      opacity: 1,
      rotation: 0,
      visible: true,
      blendMode: "normal",
      letterSpacing: 0,
    };
    const newLayers = [newLayer, ...layers];
    updateLayers(newLayers);
    setSelectedId(newLayer.id);
    setActiveTab("text");
  }

  function deleteLayer(id: string) {
    const newLayers = layers.filter(l => l.id !== id);
    updateLayers(newLayers);
    if (selectedId === id) setSelectedId(null);
  }

  function moveLayerUp(id: string) {
    const idx = layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    const nl = [...layers];
    [nl[idx], nl[idx - 1]] = [nl[idx - 1], nl[idx]];
    updateLayers(nl);
  }

  function moveLayerDown(id: string) {
    const idx = layers.findIndex(l => l.id === id);
    if (idx >= layers.length - 1) return;
    const nl = [...layers];
    [nl[idx], nl[idx + 1]] = [nl[idx + 1], nl[idx]];
    updateLayers(nl);
  }

  function onImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setBgImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
        const maxW = 1200;
        const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
        setCanvasW(Math.round(img.naturalWidth * scale));
        setCanvasH(Math.round(img.naturalHeight * scale));
        setBgImage(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSelectedId(id);
    setDragging(id);
    const layer = layers.find(l => l.id === id)!;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - layer.x * zoom,
      y: e.clientY - rect.top - layer.y * zoom,
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragOffset.x) / zoom;
    const y = (e.clientY - rect.top - dragOffset.y) / zoom;
    setLayers(prev => prev.map(l => l.id === dragging ? { ...l, x: Math.max(0, Math.min(canvasW - 20, x)), y: Math.max(0, Math.min(canvasH - 20, y)) } : l));
  }

  function handleMouseUp() {
    if (dragging) {
      pushHistory([...layers]);
      setDragging(null);
    }
  }

  async function exportCanvas() {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas" as any);
      const node = canvasRef.current;
      if (!node) return;
      const canvas = await html2canvas(node, {
        backgroundColor: bgImage ? null : bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const mimeMap = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
      const url = canvas.toDataURL(mimeMap[exportFormat], 0.95);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ob-design.${exportFormat}`;
      a.click();
      toast({ title: "Exported successfully", description: `Saved as ob-design.${exportFormat}` });
    } catch {
      toast({ title: "Export failed", description: "Install html2canvas for export", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  const panelCls = "rounded-2xl overflow-hidden";
  const cardStyle = { background: "#080d1a", border: "1px solid rgba(255,255,255,0.07)" };
  const inputCls = "w-full px-3 py-2 text-sm text-white outline-none rounded-xl font-mono";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" };
  const labelCls = "text-[10px] text-gray-600 tracking-[0.2em] font-['Rajdhani'] uppercase mb-1.5 block";

  return (
    <AdminLayout>
      <div className="flex flex-col h-full gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white font-['Space_Grotesk'] tracking-wide">IMAGE EDITOR</h2>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "rgba(6,182,212,0.5)" }}>CANVAS-BASED DESIGN STUDIO • {layers.length} LAYERS</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <motion.button whileTap={{ scale: 0.94 }} onClick={undo} disabled={historyIdx <= 0}
              className="p-2 rounded-xl text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <RotateCcw size={15} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.94 }} onClick={redo} disabled={historyIdx >= history.length - 1}
              className="p-2 rounded-xl text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <RotateCw size={15} />
            </motion.button>

            {/* Zoom */}
            <div className="flex items-center gap-1 px-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1.5 text-gray-500 hover:text-white">
                <ZoomOut size={14} />
              </motion.button>
              <span className="text-xs text-gray-400 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 text-gray-500 hover:text-white">
                <ZoomIn size={14} />
              </motion.button>
            </div>

            {/* Export */}
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid rgba(6,182,212,0.3)" }}>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)}
                className="text-xs font-mono px-2 py-2 text-cyan-400 outline-none"
                style={{ background: "rgba(6,182,212,0.08)" }}>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WEBP</option>
              </select>
              <motion.button onClick={exportCanvas} disabled={exporting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold font-['Space_Grotesk'] text-white disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #06b6d4, #7c3aed)" }}>
                <Download size={13} />
                EXPORT
              </motion.button>
            </div>
          </div>
        </div>

        {/* Main editor layout */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* LEFT PANEL */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

            {/* Upload Image */}
            <div className={panelCls} style={cardStyle}>
              <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #06b6d4 50%, transparent)" }} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={13} style={{ color: "#22d3ee" }} />
                  <span className="text-[10px] text-gray-500 tracking-[0.2em] font-['Rajdhani'] uppercase">Background Image</span>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold font-['Space_Grotesk'] text-white"
                  style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(6,182,212,0.3)" }}
                >
                  <Upload size={13} />
                  UPLOAD IMAGE
                </motion.button>

                {bgImage && (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <img src={bgImage} alt="" className="w-full h-20 object-cover" />
                    <button onClick={() => { setBgImage(null); setBgImageNatural({ w: 1200, h: 800 }); setCanvasW(1200); setCanvasH(800); }}
                      className="w-full py-1.5 text-[10px] text-red-400 hover:text-red-300 transition-colors font-mono">
                      ✕ Remove Image
                    </button>
                  </div>
                )}

                {!bgImage && (
                  <div>
                    <label className={labelCls}>Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                        className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Canvas Size</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "1200×800", w: 1200, h: 800 },
                      { label: "1080×1080", w: 1080, h: 1080 },
                      { label: "1920×1080", w: 1920, h: 1080 },
                      { label: "1200×630", w: 1200, h: 630 },
                    ].map(s => (
                      <button key={s.label} onClick={() => { setCanvasW(s.w); setCanvasH(s.h); }}
                        className="py-1 text-[10px] rounded-lg transition-all font-mono"
                        style={{
                          background: canvasW === s.w && canvasH === s.h ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)",
                          border: canvasW === s.w && canvasH === s.h ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.06)",
                          color: canvasW === s.w && canvasH === s.h ? "#22d3ee" : "#6b7280",
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setShowGrid(!showGrid)}
                    className="w-8 h-4 rounded-full transition-colors relative"
                    style={{ background: showGrid ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.1)" }}
                  >
                    <div className="absolute top-0.5 transition-all w-3 h-3 rounded-full bg-white" style={{ left: showGrid ? "17px" : "2px" }} />
                  </div>
                  <span className="text-[10px] text-gray-600 font-['Rajdhani'] tracking-widest">SHOW GRID</span>
                </label>
              </div>
            </div>

            {/* Add Text */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={addTextLayer}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-black font-['Space_Grotesk'] text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
            >
              <Plus size={15} />
              ADD TEXT LAYER
            </motion.button>

            {/* Layers panel */}
            <div className={panelCls} style={cardStyle}>
              <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #7c3aed 50%, transparent)" }} />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={13} style={{ color: "#a78bfa" }} />
                  <span className="text-[10px] text-gray-500 tracking-[0.2em] font-['Rajdhani'] uppercase">Layers ({layers.length})</span>
                </div>

                {layers.length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-4 font-mono">No layers yet</p>
                )}

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {layers.map((layer, idx) => (
                    <div
                      key={layer.id}
                      onClick={() => { setSelectedId(layer.id); setActiveTab("text"); }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group"
                      style={{
                        background: selectedId === layer.id ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.02)",
                        border: selectedId === layer.id ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                      }}
                    >
                      <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                        className="text-gray-600 hover:text-gray-300 flex-shrink-0">
                        {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>
                      <Type size={10} className="flex-shrink-0" style={{ color: layer.color }} />
                      <span className="text-[11px] text-gray-400 truncate flex-1 font-mono">{layer.text.slice(0, 16)}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); moveLayerUp(layer.id); }} className="p-0.5 text-gray-600 hover:text-white"><ChevronUp size={10} /></button>
                        <button onClick={e => { e.stopPropagation(); moveLayerDown(layer.id); }} className="p-0.5 text-gray-600 hover:text-white"><ChevronDown size={10} /></button>
                        <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} className="p-0.5 text-red-600 hover:text-red-400"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto rounded-2xl flex items-center justify-center p-4" style={{ background: "#030507" }}>
              <div
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => setSelectedId(null)}
                className="relative overflow-hidden select-none"
                style={{
                  width: canvasW * zoom,
                  height: canvasH * zoom,
                  background: bgImage ? "transparent" : bgColor,
                  cursor: dragging ? "grabbing" : "default",
                  flexShrink: 0,
                  boxShadow: "0 0 60px rgba(6,182,212,0.15), 0 0 120px rgba(124,58,237,0.1)",
                }}
              >
                {/* Background image */}
                {bgImage && (
                  <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
                )}

                {/* Grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `linear-gradient(rgba(6,182,212,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.07) 1px, transparent 1px)`,
                    backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
                  }} />
                )}

                {/* Text layers */}
                {[...layers].reverse().map(layer => {
                  if (!layer.visible) return null;
                  const selected = selectedId === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onMouseDown={(e) => handleMouseDown(e, layer.id)}
                      style={{
                        position: "absolute",
                        left: layer.x * zoom,
                        top: layer.y * zoom,
                        cursor: dragging === layer.id ? "grabbing" : "grab",
                        userSelect: "none",
                        transform: `rotate(${layer.rotation}deg)`,
                        transformOrigin: "top left",
                        zIndex: selected ? 100 : 10,
                      }}
                    >
                      {/* Selection border */}
                      {selected && (
                        <div className="absolute -inset-2 rounded border-dashed pointer-events-none" style={{ border: "1px dashed rgba(6,182,212,0.6)" }} />
                      )}
                      <span style={{
                        display: "block",
                        fontSize: layer.fontSize * zoom,
                        fontFamily: layer.fontFamily,
                        color: layer.color,
                        fontWeight: layer.bold ? "bold" : "normal",
                        fontStyle: layer.italic ? "italic" : "normal",
                        textAlign: layer.align,
                        opacity: layer.opacity,
                        textShadow: getTextShadow(layer.effect),
                        mixBlendMode: layer.blendMode as any,
                        letterSpacing: `${layer.letterSpacing}px`,
                        whiteSpace: "pre",
                        lineHeight: 1.2,
                        pointerEvents: "none",
                      }}>
                        {layer.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

            {/* Tab switcher */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["text", "layers", "canvas"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 text-[10px] font-bold font-['Rajdhani'] tracking-widest uppercase transition-all"
                  style={{
                    background: activeTab === tab ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.02)",
                    color: activeTab === tab ? "#22d3ee" : "#4b5563",
                    borderRight: tab !== "canvas" ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Text properties */}
            {activeTab === "text" && selectedLayer && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${panelCls} flex-1`} style={cardStyle}>
                <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #a855f7 50%, transparent)" }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sliders size={13} style={{ color: "#a78bfa" }} />
                    <span className="text-[10px] text-gray-500 tracking-[0.2em] font-['Rajdhani'] uppercase">Text Properties</span>
                  </div>

                  {/* Text content */}
                  <div>
                    <label className={labelCls}>Content</label>
                    <textarea
                      value={selectedLayer.text}
                      onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })}
                      rows={2}
                      className={`${inputCls} resize-none`} style={inputStyle}
                    />
                  </div>

                  {/* Font & size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Font</label>
                      <select value={selectedLayer.fontFamily} onChange={e => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                        className={inputCls} style={inputStyle}>
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Size (px)</label>
                      <select value={selectedLayer.fontSize} onChange={e => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                        className={inputCls} style={inputStyle}>
                        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className={labelCls}>Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedLayer.color} onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-10 h-8 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0" />
                      <input type="text" value={selectedLayer.color} onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>

                  {/* Style toggles */}
                  <div className="flex items-center gap-2">
                    {[
                      { icon: Bold, prop: "bold" as const, active: selectedLayer.bold },
                      { icon: Italic, prop: "italic" as const, active: selectedLayer.italic },
                    ].map(({ icon: Icon, prop, active }) => (
                      <motion.button key={prop} whileTap={{ scale: 0.92 }}
                        onClick={() => updateLayer(selectedLayer.id, { [prop]: !active })}
                        className="flex-1 py-2 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: active ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)", border: active ? "1px solid rgba(6,182,212,0.35)" : "1px solid rgba(255,255,255,0.08)", color: active ? "#22d3ee" : "#6b7280" }}>
                        <Icon size={14} />
                      </motion.button>
                    ))}
                    {(["left", "center", "right"] as const).map(a => {
                      const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                      return (
                        <motion.button key={a} whileTap={{ scale: 0.92 }}
                          onClick={() => updateLayer(selectedLayer.id, { align: a })}
                          className="flex-1 py-2 rounded-xl flex items-center justify-center transition-all"
                          style={{ background: selectedLayer.align === a ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)", border: selectedLayer.align === a ? "1px solid rgba(6,182,212,0.35)" : "1px solid rgba(255,255,255,0.08)", color: selectedLayer.align === a ? "#22d3ee" : "#6b7280" }}>
                          <Icon size={14} />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Neon Effect */}
                  <div>
                    <label className={labelCls}>Glow Effect</label>
                    <div className="grid grid-cols-2 gap-1">
                      {EFFECTS.map(ef => (
                        <button key={ef.id} onClick={() => updateLayer(selectedLayer.id, { effect: ef.id })}
                          className="py-1.5 text-[10px] rounded-lg transition-all font-mono truncate px-1"
                          style={{
                            background: selectedLayer.effect === ef.id ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
                            border: selectedLayer.effect === ef.id ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.06)",
                            color: selectedLayer.effect === ef.id ? "#a78bfa" : "#6b7280",
                          }}>
                          {ef.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opacity slider */}
                  <div>
                    <label className={labelCls}>Opacity — {Math.round(selectedLayer.opacity * 100)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity}
                      onChange={e => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                      className="w-full accent-cyan-400" />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className={labelCls}>Rotation — {selectedLayer.rotation}°</label>
                    <input type="range" min="-180" max="180" step="1" value={selectedLayer.rotation}
                      onChange={e => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                      className="w-full accent-purple-400" />
                  </div>

                  {/* Letter spacing */}
                  <div>
                    <label className={labelCls}>Letter Spacing — {selectedLayer.letterSpacing}px</label>
                    <input type="range" min="-5" max="30" step="0.5" value={selectedLayer.letterSpacing}
                      onChange={e => updateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })}
                      className="w-full accent-cyan-400" />
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>X</label>
                      <input type="number" value={Math.round(selectedLayer.x)} onChange={e => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls}>Y</label>
                      <input type="number" value={Math.round(selectedLayer.y)} onChange={e => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>

                  {/* Blend mode */}
                  <div>
                    <label className={labelCls}>Blend Mode</label>
                    <select value={selectedLayer.blendMode} onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value })}
                      className={inputCls} style={inputStyle}>
                      {BLEND_MODES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* Delete layer */}
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => deleteLayer(selectedLayer.id)}
                    className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-red-400 transition-all"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Trash2 size={13} />
                    DELETE LAYER
                  </motion.button>
                </div>
              </motion.div>
            )}

            {activeTab === "text" && !selectedLayer && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                <Type size={32} className="mb-3 opacity-20" style={{ color: "#22d3ee" }} />
                <p className="text-xs text-gray-600 font-mono">Select a layer or click<br />"Add Text Layer" to start</p>
              </div>
            )}

            {/* Quick tips */}
            {activeTab === "canvas" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={panelCls} style={cardStyle}>
                <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #22d3ee 50%, transparent)" }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wand2 size={13} style={{ color: "#22d3ee" }} />
                    <span className="text-[10px] text-gray-500 tracking-[0.2em] font-['Rajdhani'] uppercase">Editor Tips</span>
                  </div>
                  {[
                    "Upload any image as background",
                    "Click canvas to deselect layer",
                    "Drag text elements freely",
                    "Ctrl+Z to undo (use buttons)",
                    "Neon effects add cyberpunk glow",
                    "Export at 2× resolution for crisp output",
                    "Use blend modes for creative overlays",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[9px] font-mono text-cyan-500/40 mt-0.5 flex-shrink-0">0{i + 1}</span>
                      <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
