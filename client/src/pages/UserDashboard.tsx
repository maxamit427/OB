import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import {
  ShoppingBag, Clock, CheckCircle2, XCircle, Loader2,
  AlertCircle, ChevronRight, User, LogOut, Package
} from "lucide-react";
import { marketplaceApi } from "@/lib/marketplaceApi";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useEffect } from "react";
import type { Order } from "@shared/schema";

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Pending",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Clock },
  processing: { label: "Processing", color: "text-blue-400 bg-blue-500/10 border-blue-500/20",       icon: Loader2 },
  completed:  { label: "Completed",  color: "text-green-400 bg-green-500/10 border-green-500/20",    icon: CheckCircle2 },
  rejected:   { label: "Rejected",   color: "text-red-400 bg-red-500/10 border-red-500/20",          icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: "Payment Pending",  color: "text-yellow-400" },
  submitted: { label: "Payment Submitted", color: "text-blue-400" },
  approved: { label: "Payment Approved", color: "text-green-400" },
  rejected: { label: "Payment Rejected", color: "text-red-400" },
};

export default function UserDashboard() {
  const [, navigate] = useLocation();
  const { isLoggedIn, user, logout, isLoading: authLoading } = usePublicAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate("/auth/login?redirect=/dashboard");
  }, [isLoggedIn, authLoading]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/marketplace/orders/me"],
    queryFn:  () => marketplaceApi.getMyOrders(),
    enabled:  isLoggedIn,
    refetchInterval: 12000,
  });

  const orders: Order[] = data?.data ?? [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (authLoading || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-[#060612]" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="h-16" />

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <h1 className="text-white font-bold text-xl" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {user?.name}
                </h1>
                <p className="text-white/40 text-xs">{user?.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/services" className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold hover:bg-cyan-500/30 transition-all">
              <ShoppingBag size={13} /> Order Services
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs hover:bg-white/10 transition-all">
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Orders",  value: orders.length,                                        icon: Package },
            { label: "Completed",     value: orders.filter(o => o.orderStatus === "completed").length, icon: CheckCircle2 },
            { label: "Pending",       value: orders.filter(o => o.orderStatus === "pending").length,   icon: Clock },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <stat.icon size={18} className="text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-white/40 text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Orders */}
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ShoppingBag size={16} className="text-cyan-400" /> My Orders
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500/40 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="mb-4">No orders yet</p>
            <Link href="/services" className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-sm hover:bg-cyan-500/30 transition-all">
              Browse Services <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.orderStatus] ?? ORDER_STATUS_CONFIG.pending;
              const paymentCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? PAYMENT_STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-medium text-sm">{order.serviceTitle}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color} flex items-center gap-1`}>
                          <StatusIcon size={10} /> {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/40">
                        <span>Qty: {order.quantity.toLocaleString()}</span>
                        <span>Total: <span className="text-cyan-400">${order.totalPrice}</span></span>
                        <span>Method: <span className="capitalize">{order.paymentMethod}</span></span>
                        <span className={paymentCfg.color}>{paymentCfg.label}</span>
                      </div>
                      {order.link && (
                        <div className="mt-2 text-xs text-white/30 truncate max-w-xs">
                          Link: {order.link}
                        </div>
                      )}
                      {order.adminNote && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 flex items-start gap-2 text-xs bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/25 rounded-lg px-3 py-2.5"
                        >
                          <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <p className="text-amber-400 font-semibold text-xs mb-0.5">Admin Note</p>
                            <p className="text-amber-300/80">{order.adminNote}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="text-xs text-white/25 text-right flex-shrink-0">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
