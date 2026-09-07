import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
import { Plus, Edit2, Trash2, X, Save, LayoutGrid, Eye, EyeOff, Upload, ArrowUp, ArrowDown, Search, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import ImageCropper from "@/components/admin/ImageCropper";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const ICON_OPTIONS = [
  "Shield","ShieldCheck","ShieldOff","ShieldAlert","Lock","LockOpen",
  "Globe","Globe2","Facebook","Instagram","Twitter","Youtube",
  "Scale","BadgeCheck","Trash2","TrendingUp","TrendingDown","UserX",
  "PauseCircle","MessageSquare","MessageCircle","Users","User","UserCheck",
  "Star","StarHalf","Zap","ZapOff","Eye","EyeOff","Key","Cpu",
  "AlertTriangle","AlertCircle","CheckCircle","CheckCircle2",
  "Search","Settings","Settings2","Code","Code2","Terminal",
  "Wallet","CreditCard","DollarSign","Bitcoin","Coins","Gem",
  "Camera","Image","Video","Film","Music","Mic",
  "Phone","Mail","Send","Bell","BellOff","Flag",
  "Heart","ThumbsUp","Award","Trophy","Target","Crosshair",
  "Link","Link2","Share","Share2","Download","Upload",
  "Database","Server","Cloud","CloudUpload","HardDrive","Wifi",
  "Smartphone","Monitor","Laptop","Tablet","Watch","Headphones",
  "Bug","Sword","Shield","Flame","Snowflake","Sun","Moon","Sparkles",
  "Package","Box","Archive","Folder","File","FileText","Layers",
  "Activity","BarChart","BarChart2","PieChart","LineChart","TrendingUp",
  "Map","MapPin","Navigation","Compass","Anchor","Rocket","Satellite",
];

const COLOR_OPTIONS = [
  { label: "Cyan",   value: "text-cyan-400"   },
  { label: "Blue",   value: "text-blue-400"   },
  { label: "Purple", value: "text-purple-400" },
  { label: "Green",  value: "text-green-400"  },
  { label: "Orange", value: "text-orange-400" },
  { label: "Red",    value: "text-red-400"    },
  { label: "Pink",   value: "text-pink-400"   },
  { label: "Yellow", value: "text-yellow-400" },
  { label: "Sky",    value: "text-sky-400"    },
  { label: "Teal",   value: "text-teal-400"   },
  { label: "Amber",  value: "text-amber-400"  },
  { label: "White",  value: "text-white"      },
];

const TYPE_OPTIONS = [
  "service","portfolio","custom","facebook-support","copyright",
  "web3","community","account-recovery","cyber-security",
];

const colorDotMap: Record<string, string> = {
  "text-cyan-400":   "#22d3ee",
  "text-blue-400":   "#60a5fa",
  "text-purple-400": "#c084fc",
  "text-green-400":  "#4ade80",
  "text-orange-400": "#fb923c",
  "text-red-400":    "#f87171",
  "text-pink-400":   "#f472b6",
  "text-yellow-400": "#facc15",
  "text-sky-400":    "#38bdf8",
  "text-teal-400":   "#2dd4bf",
  "text-amber-400":  "#fbbf24",
  "text-white":      "#ffffff",
};

const schema = z.object({
  title:       z.string().min(1, "Title required"),
  subtitle:    z.string().default(""),
  description: z.string().default(""),
  icon:        z.string().default("Shield"),
  color:       z.string().default("text-cyan-400"),
  imageUrl:    z.string().default(""),
  type:        z.string().default("service"),
  order:       z.coerce.number().default(0),
  isVisible:   z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

function getIconComponent(name: string): React.ComponentType<any> {
  const icon = (LucideIcons as any)[name];
  return typeof icon === "function" ? icon : LucideIcons.Shield;
}

// Visual icon picker component
function IconPicker({ value, onChange, accentColor }: { value: string; onChange: (v: string) => void; accentColor: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const uniqueIcons = [...new Set(ICON_OPTIONS)];
  const filtered = query.trim()
    ? uniqueIcons.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : uniqueIcons;

  const SelectedIcon = getIconComponent(value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontFamily: "'Inter',sans-serif" }}
      >
        <span className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
          <SelectedIcon size={13} style={{ color: accentColor }} />
        </span>
        <span className="flex-1 text-left text-sm">{value}</span>
        <ChevronDown size={12} style={{ color: "#6e6e8e" }} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden shadow-2xl z-50"
            style={{ background: "#131320", border: "1px solid rgba(255,255,255,0.12)", maxHeight: 280 }}
          >
            <div className="p-2 sticky top-0" style={{ background: "#131320", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Search size={11} style={{ color: "#6e6e8e", flexShrink: 0 }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search icons…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/20 outline-none"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2" style={{ maxHeight: 220 }}>
              {filtered.length === 0 ? (
                <p className="text-center text-xs py-4" style={{ color: "#6e6e8e", fontFamily: "'Inter',sans-serif" }}>No icons found</p>
              ) : (
                <div className="grid grid-cols-6 gap-1">
                  {filtered.map(name => {
                    const Icon = getIconComponent(name);
                    const selected = name === value;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => { onChange(name); setOpen(false); setQuery(""); }}
                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all group"
                        style={selected
                          ? { background: `${accentColor}18`, border: `1px solid ${accentColor}40` }
                          : { background: "transparent", border: "1px solid transparent" }
                        }
                        onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                        onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <Icon size={16} style={{ color: selected ? accentColor : "#94a3b8" }} />
                        <span className="text-[8px] truncate w-full text-center leading-tight"
                          style={{ color: selected ? accentColor : "#64748b", fontFamily: "'Inter',sans-serif" }}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryModal({ category, onClose, colors }: {
  category?: any;
  onClose: () => void;
  colors: ReturnType<typeof useAdminTheme>["colors"];
}) {
  const qc     = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!category;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? category
      : { title: "", subtitle: "", description: "", icon: "Shield", color: "text-cyan-400", imageUrl: "", type: "service", order: 0, isVisible: true },
  });

  const isVisible  = watch("isVisible");
  const imageUrl   = watch("imageUrl");
  const iconValue  = watch("icon");
  const colorValue = watch("color");

  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const accentHex = colorDotMap[colorValue] || "#22d3ee";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createCategory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }); toast({ title: "Category created" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.updateCategory(category.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }); toast({ title: "Updated" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onSubmit  = (data: FormData) => isEdit ? updateMutation.mutate(data) : createMutation.mutate(data);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const labelStyle: React.CSSProperties = { color: colors.muted, fontFamily: "'Inter',sans-serif" };
  const inputBase: React.CSSProperties  = {
    background: colors.input, border: `1px solid ${colors.inputBorder}`,
    color: colors.text, outline: "none", fontFamily: "'Inter',sans-serif",
  };

  const PreviewIcon = getIconComponent(iconValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspectRatio={1}
          onCrop={dataUrl => { setValue("imageUrl", dataUrl); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-2xl overflow-y-auto max-h-[90vh] shadow-2xl"
        style={{ background: colors.card2, border: `1px solid ${colors.border2}`, boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <LayoutGrid size={14} style={{ color: "#06b6d4" }} />
              </div>
              <h3 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                {isEdit ? "Edit category" : "New category"}
              </h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: colors.hover, color: colors.muted }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}>
              <X size={13} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title + Subtitle */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Title *</label>
                <input {...register("title")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="e.g. Facebook" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Subtitle / tag</label>
                <input {...register("subtitle")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="e.g. Social Media" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Description</label>
              <textarea {...register("description")} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none" style={inputBase} placeholder="Service description..." />
            </div>

            {/* Icon picker + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Icon</label>
                <IconPicker value={iconValue} onChange={v => setValue("icon", v)} accentColor={accentHex} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Icon color</label>
                <select {...register("color")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase}>
                  {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Icon preview */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-xs" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>Preview:</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${accentHex}14`, border: `1px solid ${accentHex}28` }}>
                <PreviewIcon size={18} style={{ color: accentHex }} />
              </div>
              <span className="text-sm font-medium" style={{ color: accentHex, fontFamily: "'Space Grotesk',sans-serif" }}>{iconValue}</span>
            </div>

            {/* Type + Order */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Type</label>
                <select {...register("type")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase}>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Display order</label>
                <input {...register("order")} type="number" className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Category image (optional)</label>
              <div className="space-y-2">
                <input {...register("imageUrl")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="https://... or upload below" />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
                    style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.18)", color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}>
                    <Upload size={11} /> Upload & Crop
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  </label>
                  {imageUrl && (
                    <div className="flex items-center gap-2">
                      <img src={imageUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover" style={{ border: `1px solid ${colors.border2}` }} />
                      <button type="button" onClick={() => setValue("imageUrl", "")}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: colors.hover, border: `1px solid ${colors.border}` }}>
              <span className="text-xs font-medium" style={labelStyle}>Visible on website</span>
              <button type="button" onClick={() => setValue("isVisible", !isVisible)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={isVisible
                  ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", color: "#34d399", fontFamily: "'Inter',sans-serif" }
                  : { background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }
                }>
                {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                {isVisible ? "Visible" : "Hidden"}
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", fontFamily: "'Space Grotesk',sans-serif" }}>
                {isPending ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
                {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function CategoriesContent() {
  const { colors } = useAdminTheme();
  const [modal, setModal] = useState<{ open: boolean; category?: any }>({ open: false });
  const qc     = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
    queryFn:  () => adminApi.getCategories(),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }); toast({ title: "Category deleted" }); },
    onError: () => toast({ title: "Error deleting category", variant: "destructive" }),
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) => adminApi.updateCategory(id, { isVisible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }),
  });

  const reorder = useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) => adminApi.updateCategory(id, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/categories"] }),
  });

  const cats         = data?.data || [];
  const visibleCount = cats.filter((c: any) => c.isVisible).length;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Categories</h2>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              {visibleCount} visible · {cats.length} total
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", fontFamily: "'Space Grotesk',sans-serif" }}>
            <Plus size={14} /> New category
          </motion.button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: colors.card, border: `1px solid ${colors.border2}` }} />
            ))}
          </div>
        ) : cats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <LayoutGrid size={40} className="mb-3" style={{ color: colors.dimmest, opacity: 0.25 }} />
            <p className="text-sm font-medium mb-3" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No categories yet</p>
            <button onClick={() => setModal({ open: true })} className="text-xs transition-colors"
              style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#06b6d4"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dimmer}>
              + Create first category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map((cat: any, i: number) => {
              const dotColor = colorDotMap[cat.color] || "#22d3ee";
              const CatIcon  = getIconComponent(cat.icon);
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, transition: { duration: 0.18, ease: "easeOut" } }}
                  transition={{ delay: i * 0.04 }}
                  className="relative rounded-2xl overflow-hidden"
                  style={{ background: colors.card, border: `1px solid ${cat.isVisible ? colors.border2 : colors.border}`,
                    opacity: cat.isVisible ? 1 : 0.55, transition: "border-color 0.22s, box-shadow 0.22s" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${dotColor}40`;
                    (e.currentTarget as HTMLElement).style.boxShadow   = `0 12px 28px ${dotColor}0e`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = cat.isVisible ? colors.border2 : colors.border;
                    (e.currentTarget as HTMLElement).style.boxShadow   = "none";
                  }}>
                  <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${dotColor}, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.title} className="w-10 h-10 rounded-xl object-cover" style={{ border: `1px solid ${colors.border2}` }} />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: `${dotColor}12`, border: `1px solid ${dotColor}25` }}>
                            <CatIcon size={18} style={{ color: dotColor }} />
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>{cat.title}</h3>
                          {cat.subtitle && <p className="text-xs mt-0.5 font-medium" style={{ color: dotColor, fontFamily: "'Inter',sans-serif" }}>{cat.subtitle}</p>}
                        </div>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: `${dotColor}12`, color: dotColor, border: `1px solid ${dotColor}22`, fontFamily: "'Inter',sans-serif" }}>
                        {cat.type}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-4" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{cat.description}</p>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleVisibility.mutate({ id: cat.id, isVisible: !cat.isVisible })}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={cat.isVisible
                          ? { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", color: "#34d399", fontFamily: "'Inter',sans-serif" }
                          : { background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }
                        }>
                        {cat.isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                        {cat.isVisible ? "Shown" : "Hidden"}
                      </button>
                      <button onClick={() => reorder.mutate({ id: cat.id, order: Math.max(0, cat.order - 1) })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: colors.hover, border: `1px solid ${colors.border}`, color: colors.dim }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}>
                        <ArrowUp size={11} />
                      </button>
                      <button onClick={() => reorder.mutate({ id: cat.id, order: cat.order + 1 })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: colors.hover, border: `1px solid ${colors.border}`, color: colors.dim }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}>
                        <ArrowDown size={11} />
                      </button>
                      <div className="flex-1" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setModal({ open: true, category: cat })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: colors.hover, color: colors.muted, border: `1px solid ${colors.border}` }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#06b6d4"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}>
                        <Edit2 size={11} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => { if (confirm(`Delete "${cat.title}"?`)) deleteMutation.mutate(cat.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}>
                        <Trash2 size={11} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal.open && (
          <CategoryModal category={modal.category} onClose={() => setModal({ open: false })} colors={colors} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function Categories() {
  return (
    <AdminLayout>
      <SuperAdminGuard>
        <CategoriesContent />
      </SuperAdminGuard>
    </AdminLayout>
  );
}
