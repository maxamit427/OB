import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star, Clock, ArrowLeft, ShoppingCart, CheckCircle2,
  Users, Zap, Shield, ChevronRight
} from "lucide-react";
import { marketplaceApi } from "@/lib/marketplaceApi";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import type { Service } from "@shared/schema";

const BADGE_COLORS: Record<string, string> = {
  Facebook:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Instagram: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  TikTok:    "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Twitter:   "bg-sky-500/20 text-sky-300 border-sky-500/30",
  Web3:      "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isLoggedIn } = usePublicAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/marketplace/services", id],
    queryFn:  () => marketplaceApi.getService(id!),
    enabled:  !!id,
  });

  const service: Service | undefined = data?.data;

  const handleOrder = () => {
    if (!isLoggedIn) {
      navigate(`/auth/login?redirect=/checkout/${id}`);
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/40 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#060612] flex flex-col items-center justify-center text-white/40">
        <ShoppingCart size={48} className="mb-4 opacity-30" />
        <p>Service not found</p>
        <button onClick={() => navigate("/services")} className="mt-4 text-cyan-400 text-sm hover:underline">
          ← Back to Services
        </button>
      </div>
    );
  }

  const features: string[] = JSON.parse(service.features || "[]");
  const badgeClass = BADGE_COLORS[service.category] ?? "bg-white/10 text-white/60 border-white/20";

  return (
    <div className="min-h-screen bg-[#060612]" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="h-16" />

      {/* Back */}
      <div className="max-w-4xl mx-auto px-6 pt-10">
        <button
          onClick={() => navigate("/services")}
          className="flex items-center gap-2 text-white/40 hover:text-cyan-400 text-sm transition-colors mb-10"
        >
          <ArrowLeft size={16} /> Back to Services
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2 space-y-6">
            <div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badgeClass}`}>
                {service.category}
              </span>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {service.title}
              </h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-white/40">
                <span className="flex items-center gap-1"><Clock size={13} /> Working Time: {service.deliveryTime}</span>
                <span className="flex items-center gap-1"><Users size={13} /> Min: {service.minQuantity}</span>
                <span className="flex items-center gap-1"><Zap size={13} /> Max: {service.maxQuantity.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3">About This Service</h2>
              <p className="text-white/60 leading-relaxed">
                {service.longDescription || service.description}
              </p>
            </div>

            {features.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">What's Included</h2>
                <ul className="space-y-3">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/60 text-sm">
                      <CheckCircle2 size={15} className="text-cyan-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" /> Our Guarantee
              </h2>
              <ul className="space-y-2">
                {["100% safe and secure service", "Guaranteed delivery or money back", "24/7 customer support", "Real and organic results"].map((g, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/60 text-sm">
                    <Star size={12} className="text-yellow-400 flex-shrink-0" /> {g}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Order Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-1">
            <div className="sticky top-24 bg-gradient-to-br from-white/8 to-white/3 border border-white/15 rounded-2xl p-6 space-y-5">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest">Price</div>
                <div className="text-4xl font-bold text-cyan-400 mt-1">${service.price}</div>
                <div className="text-white/30 text-xs mt-1">per order</div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Working Time</span>
                  <span className="text-white/70">{service.deliveryTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Category</span>
                  <span className="text-white/70">{service.category}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Min qty</span>
                  <span className="text-white/70">{service.minQuantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Max qty</span>
                  <span className="text-white/70">{service.maxQuantity.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleOrder}
                data-testid="btn-place-order"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart size={16} />
                {isLoggedIn ? "Order Now" : "Login to Order"}
                <ChevronRight size={14} />
              </button>

              {!isLoggedIn && (
                <p className="text-xs text-white/30 text-center">
                  You need to{" "}
                  <button onClick={() => navigate(`/auth/login?redirect=/checkout/${id}`)} className="text-cyan-400 hover:underline">sign in</button>
                  {" "}to place an order
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
