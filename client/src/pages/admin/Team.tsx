import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, X, Users, Twitter, Linkedin, Github, Save, User, Upload, Eye, EyeOff, Facebook, Crop } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import ImageCropper from "@/components/admin/ImageCropper";

const schema = z.object({
  name:        z.string().min(1, "Name required"),
  position:    z.string().min(1, "Position required"),
  bio:         z.string().default(""),
  imageUrl:    z.string().default(""),
  facebookUrl: z.string().default(""),
  twitterUrl:  z.string().default(""),
  linkedinUrl: z.string().default(""),
  githubUrl:   z.string().default(""),
  order:       z.coerce.number().default(0),
  isActive:    z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const gradients = [
  "linear-gradient(135deg, #06b6d4, #8b5cf6)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  "linear-gradient(135deg, #ec4899, #f59e0b)",
];

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
      <div className="space-y-3">
        {/* Circle preview + upload controls side by side */}
        <div className="flex items-center gap-4">
          {/* Circle preview */}
          <div className="relative flex-shrink-0">
            {value ? (
              <div className="relative group">
                <img
                  src={value}
                  alt="preview"
                  className="w-24 h-24 rounded-2xl object-cover"
                  style={{ border: `2px solid ${colors.border2}` }}
                />
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.55)" }}>
                  <button type="button" onClick={() => setPendingSrc(value)} title="Re-crop"
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(6,182,212,0.8)" }}>
                    <Crop size={12} className="text-white" />
                  </button>
                  <button type="button" onClick={() => onChange("")} title="Remove"
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.8)" }}>
                    <X size={12} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
                style={{ background: "rgba(6,182,212,0.06)", border: "2px dashed rgba(6,182,212,0.25)", color: "#06b6d4" }}>
                <Upload size={14} />
                <span className="text-[9px]" style={{ fontFamily: "'Inter',sans-serif" }}>Upload</span>
              </button>
            )}
          </div>

          {/* URL input + upload button */}
          <div className="flex-1 space-y-2">
            <p className="text-[10px] leading-relaxed" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              Drag the photo inside the crop frame, then zoom until the face sits exactly where you want. The saved square stays inside the website frame.
            </p>
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs"
              style={inputBase}
              placeholder="https://... or upload a photo"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
            >
              <Upload size={11} /> Upload & Crop Photo
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <AnimatePresence>
        {pendingSrc && (
          <ImageCropper
            src={pendingSrc}
            aspectRatio={1}
            onCrop={dataUrl => { onChange(dataUrl); setPendingSrc(null); }}
            onCancel={() => setPendingSrc(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function TeamModal({ member, onClose, colors }: { member?: any; onClose: () => void; colors: ReturnType<typeof useAdminTheme>["colors"] }) {
  const qc     = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!member;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? member
      : { name: "", position: "", bio: "", imageUrl: "", facebookUrl: "", twitterUrl: "", linkedinUrl: "", githubUrl: "", order: 0, isActive: true },
  });

  const isActive = watch("isActive");
  const imageUrl = watch("imageUrl");

  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createTeamMember(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/team"] }); toast({ title: "Member added" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.updateTeamMember(member.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/team"] }); toast({ title: "Updated" }); onClose(); },
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
        className="relative w-full max-w-2xl rounded-2xl overflow-y-auto max-h-[92vh] shadow-2xl"
        style={{ background: colors.card2, border: `1px solid ${colors.border2}`, boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <User size={14} style={{ color: "#a78bfa" }} />
              </div>
              <h3 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                {isEdit ? "Edit member" : "Add member"}
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
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Full name</label>
              <input {...register("name")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="Full name" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Position / Role</label>
              <input {...register("position")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="e.g. Cyber Expert" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Bio</label>
              <textarea {...register("bio")} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none" style={inputBase} placeholder="Short bio..." />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Profile image</label>
              <ImageUploadField value={imageUrl} onChange={v => setValue("imageUrl", v)} colors={colors} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={labelStyle}>
                <Facebook size={10} /> Facebook URL
              </label>
              <input {...register("facebookUrl")} className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} placeholder="https://www.facebook.com/..." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { field: "twitterUrl", icon: Twitter, label: "Twitter" },
                { field: "linkedinUrl", icon: Linkedin, label: "LinkedIn" },
                { field: "githubUrl", icon: Github, label: "GitHub" },
              ].map(s => (
                <div key={s.field}>
                  <label className="flex items-center gap-1 text-xs font-medium mb-1.5" style={labelStyle}>
                    <s.icon size={9} />{s.label}
                  </label>
                  <input {...register(s.field as any)} className="w-full px-2 py-2 rounded-xl text-xs font-mono" style={inputBase} placeholder="URL" />
                </div>
              ))}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Display order</label>
                <input {...register("order")} type="number" className="w-full px-3 py-2.5 rounded-xl text-sm" style={inputBase} />
              </div>
              <button
                type="button"
                onClick={() => setValue("isActive", !isActive)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={isActive
                  ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399", fontFamily: "'Inter',sans-serif" }
                  : { background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }
                }
              >
                {isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                {isActive ? "Visible" : "Hidden"}
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
                style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", fontFamily: "'Space Grotesk',sans-serif" }}
              >
                {isPending
                  ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : <Save size={13} />
                }
                {isEdit ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function TeamContent() {
  const [modal, setModal] = useState<{ open: boolean; member?: any }>({ open: false });
  const qc     = useQueryClient();
  const { toast } = useToast();
  const { colors } = useAdminTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/team"],
    queryFn: () => adminApi.getTeam(),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteTeamMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Member removed" });
    },
    onError: () => toast({ title: "Error removing member", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateTeamMember(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/team"] }),
  });

  const members = data?.data || [];

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Team</h2>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              {members.filter((m: any) => m.isActive).length} visible · {members.length} total
            </p>
          </div>
          <button
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", fontFamily: "'Space Grotesk',sans-serif" }}
          >
            <Plus size={14} /> Add member
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: colors.card, border: `1px solid ${colors.border2}` }} />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: colors.dimmest }}>
            <Users size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium mb-3" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No team members yet</p>
            <button
              onClick={() => setModal({ open: true })}
              className="text-xs transition-colors"
              style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#8b5cf6"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dimmer}
            >
              + Add first member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member: any, i: number) => {
              const grad = gradients[i % gradients.length];
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative rounded-2xl overflow-hidden"
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border2}`,
                    opacity: member.isActive ? 1 : 0.6,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.3)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = colors.border2}
                >
                  {/* Gradient top accent */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: grad }} />

                  {/* Status badge */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: member.isActive ? "#22c55e" : colors.dim }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: member.isActive ? "#22c55e" : colors.dim, fontFamily: "'Inter',sans-serif" }}
                    >
                      {member.isActive ? "Public" : "Hidden"}
                    </span>
                  </div>

                  <div className="p-5">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-4 mb-3">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          style={{ border: `1px solid ${colors.border2}` }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg text-white"
                          style={{ background: grad }}
                        >
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-1">
                        <h3
                          className="text-sm font-semibold truncate"
                          style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}
                        >
                          {member.name}
                        </h3>
                        <p
                          className="text-xs mt-0.5"
                          style={{
                            background: grad,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            fontFamily: "'Inter',sans-serif",
                          }}
                        >
                          {member.position}
                        </p>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: colors.dim }}>
                          Order: {member.order}
                        </p>
                      </div>
                    </div>

                    {member.bio && (
                      <p
                        className="text-xs leading-relaxed line-clamp-2 mb-3"
                        style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}
                      >
                        {member.bio}
                      </p>
                    )}

                    {/* Social links */}
                    <div className="flex items-center gap-1.5 mb-4">
                      {member.facebookUrl && (
                        <a href={member.facebookUrl} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: colors.hover, color: colors.dim }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#60a5fa"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}
                          title="Facebook"
                        ><Facebook size={12} /></a>
                      )}
                      {member.twitterUrl && (
                        <a href={member.twitterUrl} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: colors.hover, color: colors.dim }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#38bdf8"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}
                        ><Twitter size={12} /></a>
                      )}
                      {member.linkedinUrl && (
                        <a href={member.linkedinUrl} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: colors.hover, color: colors.dim }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#60a5fa"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}
                        ><Linkedin size={12} /></a>
                      )}
                      {member.githubUrl && (
                        <a href={member.githubUrl} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: colors.hover, color: colors.dim }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dim}
                        ><Github size={12} /></a>
                      )}
                    </div>

                    {/* Actions — always visible, not just on hover */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive.mutate({ id: member.id, isActive: !member.isActive })}
                        className="py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        style={member.isActive
                          ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", fontFamily: "'Inter',sans-serif" }
                          : { background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }
                        }
                      >
                        {member.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                        {member.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => setModal({ open: true, member })}
                        className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#06b6d4"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove "${member.name}" from the team?`)) {
                            deleteMutation.mutate(member.id);
                          }
                        }}
                        className="py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center transition-colors"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}
                        title="Delete member"
                      >
                        <Trash2 size={11} />
                      </button>
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
          <TeamModal member={modal.member} onClose={() => setModal({ open: false })} colors={colors} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function Team() {
  return (
    <AdminLayout>
      <TeamContent />
    </AdminLayout>
  );
}
