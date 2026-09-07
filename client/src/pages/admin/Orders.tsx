import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Clock, CheckCircle2, XCircle, Loader2,
  Eye, X, Filter, RefreshCw, MessageSquare, Send, AlertCircle
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";

const ORDER_STATUSES  = ["all", "pending", "processing", "completed", "rejected"];
const PAYMENT_STATUSES = ["all", "pending", "submitted", "approved", "rejected"];

const ORDER_COLORS: Record<string, string> = {
  pending:    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  processing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  completed:  "text-green-400 bg-green-500/10 border-green-500/20",
  rejected:   "text-red-400 bg-red-500/10 border-red-500/20",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending:   "text-yellow-400",
  submitted: "text-blue-400",
  approved:  "text-green-400",
  rejected:  "text-red-400",
};

export default function Orders() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [orderFilter,   setOrderFilter]   = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected,      setSelected]      = useState<Order | null>(null);
  const [adminNote,     setAdminNote]     = useState("");
  const [saving,        setSaving]        = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn:  () => adminApi.getOrders(),
    refetchInterval: 15000,
  });

  const allOrders: Order[] = data?.data ?? [];

  const filtered = allOrders.filter(o => {
    const matchOrder   = orderFilter   === "all" || o.orderStatus   === orderFilter;
    const matchPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;
    return matchOrder && matchPayment;
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Order> }) =>
      adminApi.updateOrder(id, updates),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated", description: "Changes saved successfully." });
      if (result?.data) {
        setSelected(result.data);
        setAdminNote(result.data.adminNote ?? "");
      }
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const handleSaveAndClose = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.updateOrder(selected.id, { adminNote });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Saved", description: "Admin note saved." });
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statsMap = {
    total:      allOrders.length,
    pending:    allOrders.filter(o => o.orderStatus === "pending").length,
    processing: allOrders.filter(o => o.orderStatus === "processing").length,
    submitted:  allOrders.filter(o => o.paymentStatus === "submitted").length,
    completed:  allOrders.filter(o => o.orderStatus === "completed").length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Orders
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage marketplace orders and payments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs hover:bg-white/10 transition-all"
          >
            <RefreshCw size={13} /> Refresh
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total",      value: statsMap.total,      color: "text-white"       },
            { label: "Pending",    value: statsMap.pending,    color: "text-yellow-400"  },
            { label: "Processing", value: statsMap.processing, color: "text-blue-400"    },
            { label: "Submitted",  value: statsMap.submitted,  color: "text-purple-400"  },
            { label: "Completed",  value: statsMap.completed,  color: "text-green-400"   },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/8 transition-colors"
            >
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white/40 text-xs mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-white/30" />
            <span className="text-xs text-white/40">Order:</span>
            <div className="flex gap-1 flex-wrap">
              {ORDER_STATUSES.map(s => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
                    orderFilter === s
                      ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Payment:</span>
            <div className="flex gap-1 flex-wrap">
              {PAYMENT_STATUSES.map(s => (
                <button key={s} onClick={() => setPaymentFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
                    paymentFilter === s
                      ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                      : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    {["User", "Service", "Amount", "Payment", "Order Status", ""].map(h => (
                      <th key={h} className="px-5 py-3 text-white/40 font-medium text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-white/30">
                        <ShoppingBag size={32} className="mx-auto mb-3 opacity-20" />
                        No orders found
                      </td>
                    </tr>
                  )}
                  {filtered.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="text-white text-xs font-medium">{order.userName}</div>
                        <div className="text-white/30 text-xs">{order.userEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-white/80 text-xs font-medium line-clamp-1 max-w-[160px]">{order.serviceTitle}</div>
                        <div className="text-white/30 text-xs">Qty: {order.quantity.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-cyan-400 font-semibold text-xs">${order.totalPrice}</div>
                        <div className="text-white/30 text-xs capitalize">{order.paymentMethod}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`text-xs font-semibold capitalize ${PAYMENT_COLORS[order.paymentStatus] ?? "text-white/40"}`}>
                          {order.paymentStatus}
                        </div>
                        {order.transactionId && (
                          <div className="text-white/30 text-xs font-mono truncate max-w-[100px]">{order.transactionId}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${ORDER_COLORS[order.orderStatus] ?? "text-white/40 border-white/10"}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { setSelected(order); setAdminNote(order.adminNote ?? ""); }}
                          className="p-1.5 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                        >
                          <Eye size={14} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="bg-[#0d0d1a] border border-white/15 rounded-2xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  Order Details
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Order info */}
              <div className="space-y-2.5 text-sm bg-white/3 rounded-xl p-4 border border-white/8">
                {[
                  ["Order ID",       selected.id],
                  ["Service",        selected.serviceTitle],
                  ["User",           `${selected.userName} (${selected.userEmail})`],
                  ["Quantity",       selected.quantity.toLocaleString()],
                  ["Total",          `$${selected.totalPrice}`],
                  ["Target Link",    selected.link],
                  ["Payment Method", selected.paymentMethod.toUpperCase()],
                  ["Transaction ID", selected.transactionId || "—"],
                  ["Date",           new Date(selected.createdAt).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="text-white/40 flex-shrink-0 w-32 text-xs">{k}</span>
                    <span className="text-white/80 break-all text-xs">{v}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div className="flex gap-3">
                    <span className="text-white/40 flex-shrink-0 w-32 text-xs">User Notes</span>
                    <span className="text-white/80 text-xs">{selected.notes}</span>
                  </div>
                )}
              </div>

              {/* Current statuses */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">Payment</p>
                  <p className={`text-xs font-semibold capitalize ${PAYMENT_COLORS[selected.paymentStatus] ?? "text-white/50"}`}>
                    {selected.paymentStatus}
                  </p>
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">Order</p>
                  <p className={`text-xs font-semibold capitalize ${ORDER_COLORS[selected.orderStatus]?.split(" ")[0] ?? "text-white/50"}`}>
                    {selected.orderStatus}
                  </p>
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-white/50 mb-2">
                  <MessageSquare size={11} /> Admin Note (visible to user)
                </label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note for the user (optional)..."
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none transition-colors placeholder-white/20"
                />
              </div>

              {/* Payment Actions */}
              <div className="space-y-2.5">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Payment Decision</p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => updateOrder.mutate({ id: selected.id, updates: { paymentStatus: "approved" } })}
                    disabled={updateOrder.isPending || selected.paymentStatus === "approved"}
                    className={`flex-1 py-2.5 border rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                      selected.paymentStatus === "approved"
                        ? "bg-green-500/25 border-green-500/50 text-green-300"
                        : "bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/25"
                    }`}
                  >
                    {updateOrder.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {selected.paymentStatus === "approved" ? "Approved ✓" : "Approve Payment"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => updateOrder.mutate({ id: selected.id, updates: { paymentStatus: "rejected" } })}
                    disabled={updateOrder.isPending || selected.paymentStatus === "rejected"}
                    className={`flex-1 py-2.5 border rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                      selected.paymentStatus === "rejected"
                        ? "bg-red-500/25 border-red-500/50 text-red-300"
                        : "bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25"
                    }`}
                  >
                    {updateOrder.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    {selected.paymentStatus === "rejected" ? "Rejected ✗" : "Reject Payment"}
                  </motion.button>
                </div>

                {/* Order Status */}
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider pt-1">Order Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["pending", "processing", "completed", "rejected"] as const).map(st => (
                    <motion.button
                      key={st}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      onClick={() => updateOrder.mutate({ id: selected.id, updates: { orderStatus: st, adminNote } })}
                      disabled={updateOrder.isPending}
                      className={`py-2.5 border rounded-xl text-xs font-semibold capitalize transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        selected.orderStatus === st
                          ? ORDER_COLORS[st]
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8"
                      }`}
                    >
                      {updateOrder.isPending && selected.orderStatus !== st
                        ? null
                        : selected.orderStatus === st
                        ? <CheckCircle2 size={11} />
                        : <Clock size={11} />
                      }
                      {st}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Save & Close */}
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={handleSaveAndClose}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Send size={14} /> Save Note & Close</>
                }
              </motion.button>

              {selected.adminNote && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15 text-xs text-yellow-400/70">
                  <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                  <span>Current note: {selected.adminNote}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
