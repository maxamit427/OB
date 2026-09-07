import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Edit2, Trash2, Star, X, Briefcase, Save,
  ExternalLink, Upload, Crop, Image as ImageIcon,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import ImageCropper from "@/components/admin/ImageCropper";

const schema = z.object({
  title:       z.string().min(1, "Title required"),
  description: z.string().min(1, "Description required"),
  category:    z.string().min(1, "Category required"),
  tags:        z.string().default("[]"),
  imageUrl:    z.string().default(""),
  liveUrl:     z.string().default(""),
  featured:    z.boolean().default(false),
  order:       z.coerce.number().default(0),
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = ["Facebook Support", "Web3", "Copyright", "Community", "Security", "Consulting"];
const catColors: Record<string, string> = {
  "Facebook Support": "#3b82f6",
  "Web3":             "#8b5cf6",
  "Copyright":        "#10b981",
  "Community":        "#f59e0b",
  "Security":         "#ef4444",
  "Consulting":       "#06b6d4",
};

function ImageUploadField({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAdminTheme>["colors"];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const inputBase: React.CSSProperties = {
    background: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    color: colors.text,
    outline: "none",
    fontFamily: "'Inter',sans-serif",
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl text-xs"
            style={inputBase}
            placeholder="https://... or upload a file"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
          >
            <Upload size={11} /> Upload
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {value && (
          <div className="flex items-center gap-3">
            <img
              src={value}
              alt="preview"
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              style={{ border: `1px solid ${colors.border2}` }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingSrc(value)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
              >
                <Crop size={10} /> Crop
              </button>
              <span style={{ color: colors.dim }}>·</span>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs transition-colors"
                style={{ color: "#ef4444", fontFamily: "'Inter',sans-serif" }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingSrc && (
          <ImageCropper
            src={pendingSrc}
            aspectRatio={16 / 9}
            onCrop={dataUrl => { onChange(dataUrl); setPendingSrc(null); }}
            onCancel={() => setPendingSrc(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function PortfolioModal({ item, onClose, colors }: { item?: any; onClose: () => void; colors: ReturnType<typeof useAdminTheme>["colors"] }) {
  const qc     = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!item;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { ...item, tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : item.tags }
      : { title: "", description: "", category: "", tags: "[]", imageUrl: "", liveUrl: "", featured: false, order: 0 },
  });

  const featured  = watch("featured");
  const imageUrl  = watch("imageUrl");

  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createPortfolioItem(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/portfolio"] }); toast({ title: "Project added" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.updatePortfolioItem(item.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/portfolio"] }); toast({ title: "Updated" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onSubmit  = (data: FormData) => isEdit ? updateMutation.mutate(data) : createMutation.mutate(data);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const labelStyle: React.CSSProperties = { color: colors.muted, fontFamily: "'Inter',sans-serif" };
  const inputBase: React.CSSProperties  = {
    background: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    color: colors.text,
    outline: "none",
    fontFamily: "'Inter',sans-serif",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-2xl overflow-y-auto max-h-[90vh] shadow-2xl"
        style={{ background: colors.card2, border: `1px solid ${colors.border2}`, boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <Briefcase size={14} style={{ color: "#06b6d4" }} />
              </div>
              <h3 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                {isEdit ? "Edit project" : "Add project"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: colors.hover, color: colors.muted }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
            >
              <X size={13} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Title</label>
              <input {...register("title")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="Project title" />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Description</label>
              <textarea {...register("description")} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none" style={inputBase} placeholder="Project description" />
              {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Category</label>
                <select {...register("category")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Display order</label>
                <input {...register("order")} type="number" className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Tags (comma-separated or JSON)</label>
              <input {...register("tags")} className="w-full px-3 py-2.5 rounded-xl text-sm font-mono" style={inputBase} placeholder='["Tag1","Tag2"]' />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Project image</label>
              <ImageUploadField value={imageUrl} onChange={v => setValue("imageUrl", v)} colors={colors} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Live URL</label>
                <input {...register("liveUrl")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="https://..." />
              </div>
              <button
                type="button"
                onClick={() => setValue("featured", !featured)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={featured
                  ? { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24", fontFamily: "'Inter',sans-serif" }
                  : { background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }
                }
              >
                <Star size={12} fill={featured ? "currentColor" : "none"} />
                Featured
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", fontFamily: "'Space Grotesk',sans-serif" }}
              >
                {isPending
                  ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : <Save size={13} />
                }
                {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function PortfolioContent() {
  const [modal, setModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const qc     = useQueryClient();
  const { toast } = useToast();
  const { colors } = useAdminTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/portfolio"],
    queryFn: () => adminApi.getPortfolio(),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deletePortfolioItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/portfolio"] }); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Error deleting project", variant: "destructive" }),
  });

  const items = data?.data || [];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Portfolio</h2>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              {items.filter((p: any) => p.featured).length} featured · {items.length} total
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", fontFamily: "'Space Grotesk',sans-serif" }}
          >
            <Plus size={14} /> Add project
          </motion.button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: colors.card, border: `1px solid ${colors.border2}` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Briefcase size={40} className="mb-3" style={{ color: colors.dimmest, opacity: 0.3 }} />
            <p className="text-sm font-medium mb-3" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No projects yet</p>
            <button
              onClick={() => setModal({ open: true })}
              className="text-xs transition-colors"
              style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#06b6d4"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dimmer}
            >
              + Add your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: any, i: number) => {
              let tags: string[] = [];
              try { tags = JSON.parse(item.tags || "[]"); } catch {}
              const catColor = catColors[item.category] || "#06b6d4";
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                  transition={{ delay: i * 0.04, duration: 0.28 }}
                  className="relative rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border2}`,
                    transition: "border-color 0.22s, box-shadow 0.22s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${catColor}45`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${catColor}10`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Category accent line */}
                  <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${catColor}, transparent)` }} />

                  {/* Project image */}
                  {item.imageUrl && (
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        style={{ filter: "brightness(0.88)" }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to bottom, transparent 50%, ${colors.card})` }}
                      />
                      {item.featured && (
                        <div className="absolute top-2 left-2">
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(245,158,11,0.85)", color: "#fff", fontFamily: "'Inter',sans-serif" }}
                          >
                            <Star size={9} fill="currentColor" /> Featured
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3
                            className="text-sm font-semibold truncate"
                            style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}
                          >
                            {item.title}
                          </h3>
                          {!item.imageUrl && item.featured && (
                            <Star size={11} fill="currentColor" style={{ color: "#fbbf24", flexShrink: 0 }} />
                          )}
                        </div>
                        <span className="text-xs font-medium" style={{ color: catColor, fontFamily: "'Inter',sans-serif" }}>
                          {item.category}
                        </span>
                      </div>

                      {/* Action buttons — always visible */}
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => setModal({ open: true, item })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: colors.hover, color: colors.muted, border: `1px solid ${colors.border}`, transition: "color 0.15s, border-color 0.15s" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = "#06b6d4";
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.3)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = colors.muted;
                            (e.currentTarget as HTMLElement).style.borderColor = colors.border;
                          }}
                        >
                          <Edit2 size={11} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => {
                            if (confirm(`Delete "${item.title}"?`)) deleteMutation.mutate(item.id);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", transition: "background 0.15s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.16)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                        >
                          <Trash2 size={11} />
                        </motion.button>
                      </div>
                    </div>

                    <p
                      className="text-xs leading-relaxed flex-1 line-clamp-2"
                      style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}
                    >
                      {item.description}
                    </p>

                    <div className="mt-3 space-y-2">
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 4).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded-md"
                              style={{ background: `${catColor}12`, color: catColor, border: `1px solid ${catColor}25`, fontFamily: "'Inter',sans-serif" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.liveUrl && (
                        <a
                          href={item.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                          style={{ color: `${catColor}90`, fontFamily: "'Inter',sans-serif" }}
                        >
                          <ExternalLink size={10} /> Live preview
                        </a>
                      )}
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
          <PortfolioModal
            item={modal.item}
            onClose={() => setModal({ open: false })}
            colors={colors}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function Portfolio() {
  return (
    <AdminLayout>
      <PortfolioContent />
    </AdminLayout>
  );
}
