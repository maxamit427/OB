import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon, Globe, Mail, Share2, Search, Layout,
  Save, CheckCircle, AlertTriangle, ImageIcon, Link as LinkIcon,
  Type, FileText, Upload, X, Crop, ZoomIn, ZoomOut, RotateCcw,
  Home, MapPin, Facebook, ShoppingBag, CreditCard, SendHorizonal,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

// ─── IMAGE CROP MODAL ─────────────────────────────────────────────────────────
interface CropModalProps {
  src:        string;
  onComplete: (base64: string) => void;
  onClose:    () => void;
  colors:     any;
}

function ImageCropModal({ src, onComplete, onClose, colors }: CropModalProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const [cropBox,  setCropBox]  = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [dragging, setDragging] = useState<"move" | "resize" | null>(null);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, bx: 0, by: 0, bw: 0, bh: 0 });
  const [previewUrl, setPreviewUrl] = useState("");
  const [outputSize, setOutputSize] = useState(256);
  const [quality,    setQuality]    = useState(0.88);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    // Clear crop area
    const cx = cropBox.x * W;
    const cy = cropBox.y * H;
    const cw = cropBox.w * W;
    const ch = cropBox.h * H;
    ctx.clearRect(cx, cy, cw, ch);
    ctx.drawImage(img, cx, cy, cw, ch, cx, cy, cw, ch);
    // Border
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth   = 2;
    ctx.strokeRect(cx, cy, cw, ch);
    // Corner handles
    const hs = 8;
    ctx.fillStyle = "#06b6d4";
    [[cx, cy], [cx + cw - hs, cy], [cx, cy + ch - hs], [cx + cw - hs, cy + ch - hs]].forEach(([hx, hy]) => {
      ctx.fillRect(hx, hy, hs, hs);
    });
    // Grid lines (rule of thirds)
    ctx.strokeStyle = "rgba(6,182,212,0.25)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx + cw * i / 3, cy); ctx.lineTo(cx + cw * i / 3, cy + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + ch * i / 3); ctx.lineTo(cx + cw, cy + ch * i / 3); ctx.stroke();
    }
  }, [cropBox]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      if (canvasRef.current) {
        canvasRef.current.width  = 480;
        canvasRef.current.height = 320;
      }
      drawCanvas();
    };
    img.src = src;
  }, [src]);

  useEffect(() => { drawCanvas(); }, [cropBox, drawCanvas]);

  const getRelPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { rx: (e.clientX - rect.left) / rect.width, ry: (e.clientY - rect.top) / rect.height };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const { rx, ry } = getRelPos(e);
    const { x, y, w, h } = cropBox;
    const inCorner = rx >= x + w - 0.06 && rx <= x + w && ry >= y + h - 0.06 && ry <= y + h;
    const inBox    = rx >= x && rx <= x + w && ry >= y && ry <= y + h;
    if (inCorner) {
      setDragging("resize");
    } else if (inBox) {
      setDragging("move");
    }
    setDragStart({ mx: rx, my: ry, bx: x, by: y, bw: w, bh: h });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const { rx, ry } = getRelPos(e);
    const dx = rx - dragStart.mx;
    const dy = ry - dragStart.my;
    if (dragging === "move") {
      setCropBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(1 - prev.w, dragStart.bx + dx)),
        y: Math.max(0, Math.min(1 - prev.h, dragStart.by + dy)),
      }));
    } else {
      const nw = Math.max(0.1, Math.min(1 - dragStart.bx, dragStart.bw + dx));
      const nh = Math.max(0.1, Math.min(1 - dragStart.by, dragStart.bh + dy));
      setCropBox(prev => ({ ...prev, w: nw, h: nh }));
    }
  };

  const applySquareCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const ox = (img.naturalWidth - s) / 2 / img.naturalWidth;
    const oy = (img.naturalHeight - s) / 2 / img.naturalHeight;
    setCropBox({ x: ox, y: oy, w: s / img.naturalWidth, h: s / img.naturalHeight });
  };

  const resetCrop = () => setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });

  const handleCropAndOptimize = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width  = outputSize;
    out.height = outputSize;
    const ctx = out.getContext("2d")!;
    // Smooth rendering
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = "high";
    const sx = cropBox.x * img.naturalWidth;
    const sy = cropBox.y * img.naturalHeight;
    const sw = cropBox.w * img.naturalWidth;
    const sh = cropBox.h * img.naturalHeight;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    const base64 = out.toDataURL("image/png", quality);
    setPreviewUrl(base64);
    return base64;
  };

  const handleConfirm = () => {
    const base64 = handleCropAndOptimize();
    if (base64) onComplete(base64);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{ background: colors.bg, border: `1px solid ${colors.border2}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.2)" }}>
              <Crop size={14} style={{ color: "#06b6d4" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.text, fontFamily: "'Space Grotesk',sans-serif" }}>Crop & Optimize Image</p>
              <p className="text-xs" style={{ color: colors.dim }}>Drag to reposition · Corner handle to resize</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: colors.dim }} className="hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Canvas */}
        <div className="p-5 flex flex-col gap-4">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={() => setDragging(null)}
              onMouseLeave={() => setDragging(null)}
              className="w-full"
              style={{ cursor: dragging === "move" ? "grabbing" : "crosshair", display: "block" }}
            />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={applySquareCrop}
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{ background: colors.hover, color: colors.text2, border: `1px solid ${colors.border}` }}
            >
              <Crop size={12} /> Square crop
            </button>
            <button
              onClick={resetCrop}
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{ background: colors.hover, color: colors.text2, border: `1px solid ${colors.border}` }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Output size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: colors.muted }}>Output size: {outputSize}×{outputSize}px</label>
              <span className="text-xs" style={{ color: colors.dimmer }}>PNG format</span>
            </div>
            <div className="flex gap-2">
              {[128, 256, 512].map(s => (
                <button
                  key={s}
                  onClick={() => setOutputSize(s)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: outputSize === s ? "rgba(6,182,212,0.15)" : colors.hover,
                    border: `1px solid ${outputSize === s ? "rgba(6,182,212,0.4)" : colors.border}`,
                    color: outputSize === s ? "#06b6d4" : colors.dim,
                  }}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: colors.hover, border: `1px solid ${colors.border}` }}>
              <img src={previewUrl} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: colors.border2 }} alt="Preview" />
              <div>
                <p className="text-xs font-medium" style={{ color: colors.text }}>Preview</p>
                <p className="text-xs" style={{ color: colors.dim }}>
                  {Math.round((previewUrl.length * 3) / 4 / 1024)} KB · {outputSize}×{outputSize}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { handleCropAndOptimize(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: colors.hover, color: colors.text2, border: `1px solid ${colors.border}` }}
            >
              <ZoomIn size={14} /> Preview
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", color: "#fff" }}
            >
              <CheckCircle size={14} /> Use this image
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── LOGO UPLOAD FIELD ────────────────────────────────────────────────────────
function LogoUploadField({
  value, onChange, colors,
}: { value: string; onChange: (v: string) => void; colors: any }) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setCropSrc(src);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const currentSrc = value && value.startsWith("data:") ? value : value || null;

  return (
    <div className="space-y-3">
      {/* Preview */}
      {currentSrc && (
        <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: colors.hover, border: `1px solid ${colors.border}` }}>
          <img
            src={currentSrc}
            alt="Logo"
            className="w-16 h-16 rounded-full object-cover border-2"
            style={{ borderColor: "rgba(6,182,212,0.4)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: colors.text }}>Current logo</p>
            <p className="text-xs truncate mt-0.5" style={{ color: colors.dim }}>
              {value.startsWith("data:") ? `Base64 image (${Math.round(value.length / 1024)} KB)` : value}
            </p>
          </div>
          <button onClick={clearLogo} title="Remove logo" style={{ color: colors.dim }} className="hover:text-red-400 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border-dashed"
          style={{ border: `2px dashed ${colors.inputBorder}`, color: colors.dim, background: colors.input }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.4)"; (e.currentTarget as HTMLElement).style.color = "#06b6d4"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.inputBorder; (e.currentTarget as HTMLElement).style.color = colors.dim; }}
        >
          <Upload size={15} />
          Upload image (PNG / JPG / SVG)
        </button>
      </div>

      {/* OR use URL */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: colors.border }} />
        <span className="text-xs" style={{ color: colors.dimmer }}>or paste URL</span>
        <div className="flex-1 h-px" style={{ background: colors.border }} />
      </div>
      <input
        type="url"
        value={value && !value.startsWith("data:") ? value : ""}
        onChange={e => onChange(e.target.value)}
        placeholder="https://example.com/logo.png"
        className="w-full px-3 py-2.5 rounded-xl text-sm"
        style={{
          background: colors.input, border: `1px solid ${colors.inputBorder}`,
          color: colors.text, outline: "none", fontFamily: "'Inter',sans-serif",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
        onBlur={e => (e.currentTarget.style.borderColor = colors.inputBorder)}
      />

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Crop modal */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          colors={colors}
          onComplete={base64 => { onChange(base64); setCropSrc(null); }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

// ─── SETTING GROUPS ──────────────────────────────────────────────────────────
const settingGroups = [
  {
    label: "Brand & Logo", icon: ImageIcon, color: "#06b6d4",
    keys: [
      { key: "nav_brand_name", label: "Brand / site name",   placeholder: "OLDER BROTHER" },
      { key: "logo_url",       label: "Logo image",          type: "logo"                  },
    ],
  },
  {
    label: "Site Identity", icon: Globe, color: "#8b5cf6",
    keys: [
      { key: "site_title",       label: "Site title",       placeholder: "Older Brother Team" },
      { key: "site_description", label: "Site description", placeholder: "Web3 Digital Security Platform", type: "textarea" },
      { key: "seo_keywords",     label: "Meta keywords",    placeholder: "Web3, Security, ...", help: "Comma separated" },
    ],
  },
  {
    label: "Hero Section", icon: Layout, color: "#10b981",
    keys: [
      { key: "hero_badge_text",      label: "Badge text",         placeholder: "Next Gen Digital Guidance" },
      { key: "hero_headline",        label: "Main headline",      placeholder: "Protecting Your Digital Legacy" },
      { key: "hero_subheadline",     label: "Subheadline",        type: "textarea", placeholder: "Hero description..." },
      { key: "hero_security_notice", label: "Security notice",    placeholder: "Leave blank to hide (was offensive text — now editable)", help: "Hidden if empty" },
      { key: "hero_cta_primary",     label: "Primary CTA button", placeholder: "Start Conversation" },
      { key: "hero_cta_secondary",   label: "Secondary CTA button", placeholder: "View Work" },
      { key: "hero_logo_link",       label: "Logo click URL",     placeholder: "https://...", type: "url" },
    ],
  },
  {
    label: "About Section", icon: FileText, color: "#f59e0b",
    keys: [
      { key: "about_title",       label: "Section title",       placeholder: "Our Journey" },
      { key: "about_description", label: "Section description", type: "textarea", placeholder: "Description..." },
    ],
  },
  {
    label: "Services Section", icon: SettingsIcon, color: "#ec4899",
    keys: [
      { key: "services_subtitle",    label: "Section label",   placeholder: "What We Do" },
      { key: "services_title",       label: "Section title",   placeholder: "Premium Digital Services" },
      { key: "services_description", label: "Section description", type: "textarea", placeholder: "Services description..." },
    ],
  },
  {
    label: "Contact Section", icon: Mail, color: "#06b6d4",
    keys: [
      { key: "contact_label",        label: "Section label",    placeholder: "Get in Touch" },
      { key: "contact_title",        label: "Section title",    placeholder: "Ready to secure your digital future?" },
      { key: "contact_description",  label: "Description",      type: "textarea", placeholder: "Contact description..." },
      { key: "contact_email",        label: "Contact email",    type: "email",  placeholder: "email@example.com" },
      { key: "contact_location",     label: "Location text",    placeholder: "Decentralized & Remote" },
      { key: "contact_facebook_url", label: "Facebook page URL", type: "url",  placeholder: "https://facebook.com/..." },
      { key: "contact_facebook_cta", label: "Facebook button text", placeholder: "Visit Our Facebook Page" },
    ],
  },
  {
    label: "Footer", icon: Type, color: "#a78bfa",
    keys: [
      { key: "footer_copyright", label: "Copyright text", placeholder: "Older Brother Team. All rights reserved." },
      { key: "footer_credit",    label: "Credit text",    placeholder: "Design & Development by Amit Max", help: "Leave blank to hide" },
    ],
  },
  {
    label: "Social Media", icon: Share2, color: "#f472b6",
    keys: [
      { key: "twitter_url",   label: "Twitter / X",  placeholder: "https://twitter.com/..." },
      { key: "instagram_url", label: "Instagram",    placeholder: "https://instagram.com/..." },
      { key: "telegram_url",  label: "Telegram",     placeholder: "https://t.me/..." },
    ],
  },
  {
    label: "Marketplace Page", icon: ShoppingBag, color: "#06b6d4",
    keys: [
      { key: "marketplace_badge",    label: "Badge text",      placeholder: "Digital Services Marketplace" },
      { key: "marketplace_title",    label: "Page title",      placeholder: "Premium Digital Services" },
      { key: "marketplace_subtitle", label: "Page subtitle",   placeholder: "Professional services delivered by experts.", type: "textarea" },
    ],
  },
  {
    label: "Payment Numbers", icon: CreditCard, color: "#10b981",
    keys: [
      { key: "bkash_number",  label: "bKash number",  placeholder: "01XXXXXXXXX" },
      { key: "nagad_number",  label: "Nagad number",  placeholder: "01XXXXXXXXX" },
      { key: "rocket_number", label: "Rocket number", placeholder: "01XXXXXXXXX" },
    ],
  },
];

// ─── SETTINGS CONTENT ────────────────────────────────────────────────────────
function SettingsContent() {
  const { colors } = useAdminTheme();
  const { toast }  = useToast();
  const qc         = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn:  () => adminApi.getSettings(),
  });

  const [values,          setValues]          = useState<Record<string, string>>({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saved,           setSaved]           = useState(false);

  useEffect(() => {
    if (data?.data) {
      setValues(data.data);
      setMaintenanceMode(data.data.maintenance_mode === "true");
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, string>) => adminApi.updateSettings(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/public/settings"] });
      toast({ title: "Configuration saved" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave   = () => updateMutation.mutate({ ...values, maintenance_mode: maintenanceMode.toString() });
  const handleChange = (key: string, value: string) => setValues(prev => ({ ...prev, [key]: value }));

  const inputBase: React.CSSProperties = {
    background: colors.input,
    border:     `1px solid ${colors.inputBorder}`,
    color:      colors.text,
    outline:    "none",
    fontFamily: "'Inter',sans-serif",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Configuration</h2>
          <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>All website content & settings</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          style={saved
            ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399", fontFamily: "'Space Grotesk',sans-serif" }
            : { background: "linear-gradient(135deg, #0891b2, #7c3aed)", color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }
          }
          data-testid="btn-save-settings"
        >
          {saved
            ? <><CheckCircle size={13} /> Saved</>
            : updateMutation.isPending
            ? <><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</>
            : <><Save size={13} /> Save changes</>
          }
        </motion.button>
      </div>

      {/* Maintenance toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2, transition: { duration: 0.18 } }}
        className="rounded-2xl"
        style={{
          background: maintenanceMode ? "rgba(245,158,11,0.04)" : colors.card,
          border:     maintenanceMode ? "1px solid rgba(245,158,11,0.22)" : `1px solid ${colors.border2}`,
        }}
        onMouseEnter={e => { if (!maintenanceMode) (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.22)"; }}
        onMouseLeave={e => { if (!maintenanceMode) (e.currentTarget as HTMLElement).style.borderColor = colors.border2; }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              background: maintenanceMode ? "rgba(245,158,11,0.12)" : colors.hover,
              border:     maintenanceMode ? "1px solid rgba(245,158,11,0.22)" : `1px solid ${colors.border}`,
            }}>
              <AlertTriangle size={14} style={{ color: maintenanceMode ? "#fbbf24" : colors.dim }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Maintenance mode</p>
              <p className="text-xs mt-0.5" style={{ color: maintenanceMode ? "rgba(245,158,11,0.7)" : colors.dim, fontFamily: "'Inter',sans-serif" }}>
                {maintenanceMode ? "Site is offline — maintenance in progress" : "Site is live and publicly accessible"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: maintenanceMode ? "#f59e0b" : colors.inputBorder }}
            data-testid="toggle-maintenance"
          >
            <motion.div
              animate={{ x: maintenanceMode ? 22 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>
      </motion.div>

      {/* Setting groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: colors.card, border: `1px solid ${colors.border2}` }} />
          ))}
        </div>
      ) : (
        settingGroups.map((group, gi) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.18 } }}
            transition={{ delay: gi * 0.04 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ background: colors.card, border: `1px solid ${colors.border2}`, transition: "border-color 0.22s, box-shadow 0.22s" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${group.color}32`;
              (e.currentTarget as HTMLElement).style.boxShadow   = `0 8px 24px ${group.color}08`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
              (e.currentTarget as HTMLElement).style.boxShadow   = "none";
            }}
          >
            <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full" style={{ background: `linear-gradient(180deg, ${group.color}, transparent)` }} />

            <div className="p-5 pl-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${group.color}12`, border: `1px solid ${group.color}25` }}>
                  <group.icon size={13} style={{ color: group.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: group.color, fontFamily: "'Inter',sans-serif" }}>{group.label}</span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${group.color}18, transparent)` }} />
              </div>

              <div className="space-y-3">
                {group.keys.map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{field.label}</label>
                      {field.help && <span className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>{field.help}</span>}
                    </div>

                    {field.type === "logo" ? (
                      <LogoUploadField
                        value={values[field.key] || ""}
                        onChange={v => handleChange(field.key, v)}
                        colors={colors}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={values[field.key] || ""}
                        onChange={e => handleChange(field.key, e.target.value)}
                        rows={3}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                        style={inputBase}
                        onFocus={e => (e.currentTarget.style.borderColor = `${group.color}50`)}
                        onBlur={e => (e.currentTarget.style.borderColor = colors.inputBorder)}
                      />
                    ) : (
                      <input
                        type={field.type === "url" ? "url" : field.type === "email" ? "email" : "text"}
                        value={values[field.key] || ""}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm"
                        style={inputBase}
                        onFocus={e => (e.currentTarget.style.borderColor = `${group.color}50`)}
                        onBlur={e => (e.currentTarget.style.borderColor = colors.inputBorder)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))
      )}

      <div className="pb-2 flex items-center gap-2 px-1">
        <SettingsIcon size={11} style={{ color: colors.dimmest }} />
        <span className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>
          All changes are reflected immediately on the website after saving.
        </span>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <AdminLayout>
      <SuperAdminGuard>
        <SettingsContent />
      </SuperAdminGuard>
    </AdminLayout>
  );
}
