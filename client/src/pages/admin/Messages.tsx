import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Search, Trash2, Mail, MailOpen, Clock, X, Reply, Inbox } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function MessagesContent() {
  const { colors } = useAdminTheme();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "unread" | "read">("all");
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/messages"],
    queryFn:  () => adminApi.getMessages(),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelected(null);
      toast({ title: "Message deleted" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) => adminApi.markRead(id, isRead),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/messages"] }),
  });

  const messages = (data?.data || []).filter((m: any) => {
    const matchSearch = search === "" || `${m.firstName} ${m.lastName} ${m.email} ${m.message}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "unread" && !m.isRead) || (filter === "read" && m.isRead);
    return matchSearch && matchFilter;
  });

  const allMessages  = data?.data || [];
  const unreadCount  = allMessages.filter((m: any) => !m.isRead).length;

  const handleSelect = (msg: any) => {
    setSelected(msg);
    if (!msg.isRead) markReadMutation.mutate({ id: msg.id, isRead: true });
  };

  const iconBtn: React.CSSProperties = {
    background: colors.hover,
    border:     `1px solid ${colors.border}`,
    color:      colors.muted,
    transition: "color 0.15s, background 0.15s",
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4 h-[calc(100vh-100px)]">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Inbox size={15} style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Inbox</h2>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              {unreadCount > 0 ? `${unreadCount} unread · ` : ""}{allMessages.length} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.dimmer }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-2 text-xs outline-none rounded-xl w-44"
              style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.text, fontFamily: "'Inter',sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: colors.input }}>
            {(["all", "unread", "read"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                style={filter === f
                  ? { background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)" }
                  : { color: colors.dim, border: "1px solid transparent", fontFamily: "'Inter',sans-serif" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Message list */}
        <motion.div
          whileHover={{ transition: { duration: 0 } }}
          className="w-72 flex-shrink-0 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
        >
          <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <span className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>{messages.length} messages</span>
            {unreadCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: colors.hover }} />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <MessageSquare size={32} className="mb-3" style={{ color: colors.dimmest, opacity: 0.3 }} />
                <p className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>No messages</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {messages.map((msg: any, i: number) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelect(msg)}
                    className="p-3 rounded-xl cursor-pointer transition-all relative"
                    style={selected?.id === msg.id
                      ? { background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }
                      : { background: "transparent", border: `1px solid transparent` }
                    }
                    onMouseEnter={e => {
                      if (selected?.id !== msg.id) (e.currentTarget as HTMLElement).style.background = colors.hover;
                    }}
                    onMouseLeave={e => {
                      if (selected?.id !== msg.id) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {selected?.id === msg.id && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "#06b6d4" }} />
                    )}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!msg.isRead && (
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#06b6d4" }} />
                        )}
                        <p className="text-xs font-semibold truncate" style={{ color: msg.isRead ? colors.muted : colors.text, fontFamily: "'Inter',sans-serif" }}>
                          {msg.firstName} {msg.lastName}
                        </p>
                      </div>
                      <span className="text-xs flex-shrink-0 font-mono" style={{ color: colors.dimmest }}>{timeAgo(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs truncate font-mono" style={{ color: "rgba(6,182,212,0.55)" }}>{msg.email}</p>
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>{msg.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Detail pane */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden flex flex-col" style={{ background: colors.card, border: `1px solid ${colors.border2}` }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-sm"
                        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}
                      >
                        {selected.firstName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                          {selected.firstName} {selected.lastName}
                        </h3>
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-xs flex items-center gap-1.5 mt-0.5 hover:underline"
                          style={{ color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
                        >
                          <Mail size={10} /> {selected.email}
                        </a>
                        <p className="text-xs mt-1 flex items-center gap-1 font-mono" style={{ color: colors.dimmer }}>
                          <Clock size={9} /> {formatDate(selected.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                        onClick={() => markReadMutation.mutate({ id: selected.id, isRead: !selected.isRead })}
                        title={selected.isRead ? "Mark unread" : "Mark read"}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={iconBtn}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#06b6d4"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
                      >
                        {selected.isRead ? <MailOpen size={13} /> : <Mail size={13} />}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                        onClick={() => deleteMutation.mutate(selected.id)}
                        disabled={deleteMutation.isPending}
                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                      >
                        <Trash2 size={13} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setSelected(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={iconBtn}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
                      >
                        <X size={13} />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl p-5"
                    style={{ background: colors.hover, border: `1px solid ${colors.border}` }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: colors.text2, fontFamily: "'Inter',sans-serif" }}>
                      {selected.message}
                    </p>
                  </motion.div>
                </div>

                {/* Reply */}
                <div className="p-5 flex-shrink-0" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <motion.a
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    href={`mailto:${selected.email}?subject=Re: Your message to Older Brother Team`}
                    className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl font-medium text-sm transition-colors"
                    style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.22)", color: "#06b6d4", fontFamily: "'Space Grotesk',sans-serif" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background    = "rgba(6,182,212,0.16)";
                      (e.currentTarget as HTMLElement).style.borderColor   = "rgba(6,182,212,0.38)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background    = "rgba(6,182,212,0.1)";
                      (e.currentTarget as HTMLElement).style.borderColor   = "rgba(6,182,212,0.22)";
                    }}
                  >
                    <Reply size={14} />
                    Reply via email
                  </motion.a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-2"
              >
                <MessageSquare size={40} style={{ color: colors.dimmest, opacity: 0.25 }} />
                <p className="text-sm font-medium" style={{ fontFamily: "'Inter',sans-serif", color: colors.dimmer }}>Select a message</p>
                <p className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: colors.dimmest }}>Choose from the list to read</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  return (
    <AdminLayout>
      <MessagesContent />
    </AdminLayout>
  );
}
