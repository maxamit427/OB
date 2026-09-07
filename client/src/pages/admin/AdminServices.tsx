import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2,
  Loader2, X, Save, Eye, EyeOff, Upload, Image as ImageIcon,
  ShoppingBag, Clock, Package,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import ImageCropper from "@/components/admin/ImageCropper";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import type { Service, Category } from "@shared/schema";

const EMPTY: Partial<Service> = {
  title: "", description: "", longDescription: "", price: "",
  category: "", platform: "", deliveryTime: "1-3 days",
  features: "[]", minQuantity: 1, maxQuantity: 10000,
  isActive: true, imageUrl: "", order: 0,
};

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ colors, ...props }: any) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
      style={{
        background: colors.input,
        border: `1px solid ${colors.border2}`,
        color: colors.text,
        fontFamily: "'Inter',sans-serif",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.45)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = colors.border2; }}
    />
  );
}

function StyledTextarea({ colors, ...props }: any) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
      style={{
        background: colors.input,
        border: `1px solid ${colors.border2}`,
        color: colors.text,
        fontFamily: "'Inter',sans-serif",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.45)"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = colors.border2; }}
    />
  );
}

function AdminServicesInner() {
  const { toast } = useToast();
  const { colors } = useAdminTheme();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<{ open: boolean; service: Partial<Service> }>({ open: false, service: EMPTY });
  const [featuresText, setFeaturesText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn:  () => adminApi.getServices(),
  });
  const services: Service[] = data?.data ?? [];

  const { data: catsData } = useQuery({
    queryKey: ["/api/admin/categories"],
    queryFn:  () => adminApi.getCategories(),
  });
  const categories: string[] = (catsData?.data ?? []).map((c: Category) => c.title);

  const openCreate = () => {
    setModal({ open: true, service: { ...EMPTY, category: categories[0] ?? "" } });
    setFeaturesText("");
  };
  const openEdit = (s: Service) => {
    const features: string[] = JSON.parse(s.features || "[]");
    setFeaturesText(features.join("\n"));
    setModal({ open: true, service: { ...s } });
  };
  const closeModal = () => setModal({ open: false, service: EMPTY });
  const set = (field: keyof Service, val: any) =>
    setModal(m => ({ ...m, service: { ...m.service, [field]: val } }));

  const save = useMutation({
    mutationFn: () => {
      const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
      const payload = { ...modal.service, features: JSON.stringify(features) };
      if (modal.service.id) return adminApi.updateService(modal.service.id, payload);
      return adminApi.createService(payload);
    },
    onSuccess: () => {
      toast({ title: modal.service.id ? "Service updated" : "Service created" });
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      closeModal();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: (s: Service) => adminApi.updateService(s.id, { isActive: !s.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-services"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteService(id),
    onSuccess: () => {
      toast({ title: "Service deleted" });
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      setDeleteId(null);
    },
  });

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <SuperAdminGuard>
        {cropSrc && (
          <ImageCropper
            src={cropSrc}
            aspectRatio={4 / 3}
            onCrop={dataUrl => { set("imageUrl", dataUrl); setCropSrc(null); }}
            onCancel={() => setCropSrc(null)}
          />
        )}

        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ShoppingBag size={16} style={{ color: "#06b6d4" }} />
                <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                  Services
                </h2>
              </div>
              <p className="text-xs" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
                Manage your marketplace services — {services.length} total
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.12))",
                border: "1px solid rgba(6,182,212,0.3)",
                color: "#06b6d4",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(139,92,246,0.18))"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.12))"}
            >
              <Plus size={15} /> Add Service
            </motion.button>
          </div>

          {/* Services Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={22} className="animate-spin" style={{ color: "#06b6d4" }} />
            </div>
          ) : services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ background: colors.card, border: `1px dashed ${colors.border2}` }}
            >
              <ShoppingBag size={36} className="mb-3" style={{ color: colors.dimmest, opacity: 0.3 }} />
              <p className="text-sm font-medium mb-1" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
                No services yet
              </p>
              <p className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>
                Click "Add Service" to create your first one
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {services.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -3, transition: { duration: 0.18 } }}
                    className="rounded-2xl overflow-hidden flex flex-col"
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border2}`,
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.25)";
                      (e.currentTarget as HTMLElement).style.boxShadow   = "0 8px 24px rgba(6,182,212,0.06)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
                      (e.currentTarget as HTMLElement).style.boxShadow   = "none";
                    }}
                  >
                    {/* Image */}
                    <div className="relative h-36 overflow-hidden" style={{ background: colors.input }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={28} style={{ color: colors.dimmest, opacity: 0.25 }} />
                        </div>
                      )}
                      {/* Status badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <motion.button
                          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                          onClick={() => toggle.mutate(s)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm"
                          style={s.isActive
                            ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
                            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
                          }
                        >
                          {s.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                          {s.isActive ? "Active" : "Hidden"}
                        </motion.button>
                      </div>
                      {/* Category chip */}
                      {s.category && (
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className="px-2 py-0.5 rounded-lg text-xs backdrop-blur-sm" style={{
                            background: "rgba(139,92,246,0.2)",
                            border: "1px solid rgba(139,92,246,0.3)",
                            color: "#c4b5fd",
                            fontFamily: "'Inter',sans-serif",
                          }}>
                            {s.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm mb-1 truncate" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                        {s.title}
                      </h3>
                      <p className="text-xs mb-3 line-clamp-2 flex-1" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                        {s.description}
                      </p>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-base font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "#06b6d4" }}>
                            ${s.price}
                          </span>
                        </div>
                        {s.deliveryTime && (
                          <div className="flex items-center gap-1">
                            <Clock size={11} style={{ color: colors.dimmer }} />
                            <span className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>
                              {s.deliveryTime}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Package size={11} style={{ color: colors.dimmer }} />
                          <span className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>
                            {s.minQuantity}–{s.maxQuantity}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                        <motion.button
                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                          onClick={() => openEdit(s)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: "rgba(6,182,212,0.07)",
                            border: `1px solid rgba(6,182,212,0.18)`,
                            color: "#06b6d4",
                            fontFamily: "'Inter',sans-serif",
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.13)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.07)"}
                        >
                          <Pencil size={11} /> Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                          onClick={() => setDeleteId(s.id)}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.15)",
                            color: "#f87171",
                            fontFamily: "'Inter',sans-serif",
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"}
                        >
                          <Trash2 size={11} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Edit/Create Modal */}
        <AnimatePresence>
          {modal.open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                style={{ background: colors.bg, border: `1px solid ${colors.border2}` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={15} style={{ color: "#06b6d4" }} />
                    <h2 className="font-bold text-base" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                      {modal.service.id ? "Edit Service" : "New Service"}
                    </h2>
                  </div>
                  <button onClick={closeModal} className="p-1.5 rounded-xl transition-all"
                    style={{ color: colors.dim }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.text; (e.currentTarget as HTMLElement).style.background = colors.hover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.dim;  (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 admin-scroll">
                  {/* Image upload */}
                  <Field label="SERVICE IMAGE" colors={colors}>
                    <div className="flex items-start gap-3">
                      <div
                        className="w-20 h-16 rounded-xl flex-shrink-0 overflow-hidden"
                        style={{ background: colors.input, border: `1px dashed ${colors.border2}` }}
                      >
                        {modal.service.imageUrl ? (
                          <div className="relative group w-full h-full">
                            <img src={modal.service.imageUrl} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => set("imageUrl", "")}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(0,0,0,0.5)" }}>
                              <X size={14} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={18} style={{ color: colors.dimmest, opacity: 0.4 }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                          onClick={() => fileRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.22)", color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.14)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.08)"}
                        >
                          <Upload size={11} /> Upload & Crop
                        </motion.button>
                        <input
                          type="text"
                          value={modal.service.imageUrl || ""}
                          onChange={e => set("imageUrl", e.target.value)}
                          placeholder="or paste image URL…"
                          className="w-full px-3 py-1.5 rounded-xl text-xs outline-none transition-colors"
                          style={{ background: colors.input, border: `1px solid ${colors.border2}`, color: colors.text, fontFamily: "'Inter',sans-serif" }}
                          onFocus={e => e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)"}
                          onBlur={e  => e.currentTarget.style.borderColor = colors.border2}
                        />
                      </div>
                    </div>
                  </Field>

                  <Field label="TITLE *" colors={colors}>
                    <StyledInput colors={colors} value={modal.service.title} onChange={(e: any) => set("title", e.target.value)} placeholder="Service name" />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CATEGORY *" colors={colors}>
                      <select
                        value={modal.service.category}
                        onChange={e => set("category", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                        style={{ background: colors.input, border: `1px solid ${colors.border2}`, color: colors.text, fontFamily: "'Inter',sans-serif" }}
                      >
                        {categories.length === 0 && <option value="">No categories</option>}
                        {modal.service.category && !categories.includes(modal.service.category) && (
                          <option value={modal.service.category}>{modal.service.category}</option>
                        )}
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="PRICE (USD) *" colors={colors}>
                      <StyledInput colors={colors} type="number" min="0" step="0.01" value={modal.service.price} onChange={(e: any) => set("price", e.target.value)} placeholder="0.00" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="MIN QTY" colors={colors}>
                      <StyledInput colors={colors} type="number" min="1" value={modal.service.minQuantity} onChange={(e: any) => set("minQuantity", parseInt(e.target.value))} />
                    </Field>
                    <Field label="MAX QTY" colors={colors}>
                      <StyledInput colors={colors} type="number" min="1" value={modal.service.maxQuantity} onChange={(e: any) => set("maxQuantity", parseInt(e.target.value))} />
                    </Field>
                    <Field label="DELIVERY TIME" colors={colors}>
                      <StyledInput colors={colors} value={modal.service.deliveryTime} onChange={(e: any) => set("deliveryTime", e.target.value)} placeholder="e.g. 1-3 days" />
                    </Field>
                  </div>

                  <Field label="SHORT DESCRIPTION *" colors={colors}>
                    <StyledTextarea colors={colors} value={modal.service.description} onChange={(e: any) => set("description", e.target.value)} rows={2} placeholder="Brief description shown in cards…" />
                  </Field>

                  <Field label="LONG DESCRIPTION (detail page)" colors={colors}>
                    <StyledTextarea colors={colors} value={modal.service.longDescription} onChange={(e: any) => set("longDescription", e.target.value)} rows={3} placeholder="Full description shown on service detail page…" />
                  </Field>

                  <Field label="FEATURES (one per line)" colors={colors}>
                    <StyledTextarea
                      colors={colors}
                      value={featuresText}
                      onChange={(e: any) => setFeaturesText(e.target.value)}
                      rows={4}
                      placeholder={"Fast delivery\nReal accounts\n24/7 support"}
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-4">
                    <div className="w-32">
                      <Field label="DISPLAY ORDER" colors={colors}>
                        <StyledInput colors={colors} type="number" value={modal.service.order} onChange={(e: any) => set("order", parseInt(e.target.value))} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer pt-5">
                      <div className="relative">
                        <input type="checkbox" checked={modal.service.isActive} onChange={e => set("isActive", e.target.checked)} className="sr-only" />
                        <div className="w-10 h-6 rounded-full transition-colors" style={{ background: modal.service.isActive ? "#06b6d4" : colors.input, border: `1px solid ${colors.border2}` }}>
                          <div
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                            style={{ transform: modal.service.isActive ? "translateX(20px)" : "translateX(4px)" }}
                          />
                        </div>
                      </div>
                      <span className="text-sm" style={{ color: colors.text2, fontFamily: "'Inter',sans-serif" }}>Active</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: colors.input, border: `1px solid ${colors.border2}`, color: colors.text2, fontFamily: "'Space Grotesk',sans-serif" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = colors.input}
                  >
                    Cancel
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {modal.service.id ? "Save Changes" : "Create Service"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deleteId && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl p-7 text-center space-y-4"
                style={{ background: colors.bg, border: `1px solid rgba(239,68,68,0.2)` }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <Trash2 size={20} style={{ color: "#f87171" }} />
                </div>
                <h3 className="font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Delete Service?</h3>
                <p className="text-sm" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>This action cannot be undone.</p>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: colors.input, border: `1px solid ${colors.border2}`, color: colors.text2, fontFamily: "'Inter',sans-serif" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = colors.input}
                  >
                    Cancel
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={() => del.mutate(deleteId!)}
                    disabled={del.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Inter',sans-serif" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.22)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"}
                  >
                    {del.isPending ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SuperAdminGuard>
  );
}

export default function AdminServices() {
  return <AdminLayout><AdminServicesInner /></AdminLayout>;
}
