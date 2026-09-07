import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ArrowLeft, CheckCircle2, Loader2,
  CreditCard, AlertCircle, ChevronRight, Copy, Check
} from "lucide-react";
import { marketplaceApi } from "@/lib/marketplaceApi";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@shared/schema";

const PAYMENT_METHODS = [
  { id: "bkash",  label: "bKash",  color: "#E2136E", settingKey: "bkash_number" },
  { id: "nagad",  label: "Nagad",  color: "#F55F21", settingKey: "nagad_number" },
  { id: "rocket", label: "Rocket", color: "#8B008B", settingKey: "rocket_number" },
];

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isLoggedIn, user } = usePublicAuth();
  const { settings } = useSiteSettings();
  const { toast } = useToast();

  const [quantity, setQuantity]         = useState(1);
  const [link, setLink]                 = useState("");
  const [notes, setNotes]               = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "rocket">("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [step, setStep]                 = useState<"details" | "payment" | "confirm">("details");
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    if (!isLoggedIn) navigate(`/auth/login?redirect=/checkout/${id}`);
  }, [isLoggedIn]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/marketplace/services", id],
    queryFn:  () => marketplaceApi.getService(id!),
    enabled:  !!id,
  });
  const service: Service | undefined = data?.data;

  const total = service ? (parseFloat(service.price) * quantity).toFixed(2) : "0.00";

  const selectedPayment = PAYMENT_METHODS.find(p => p.id === paymentMethod)!;
  const paymentNumber: string = settings[selectedPayment.settingKey] || "Contact admin for payment details";

  const mutation = useMutation({
    mutationFn: () => marketplaceApi.createOrder({
      serviceId:     service!.id,
      quantity,
      link,
      notes,
      paymentMethod,
      transactionId,
    }),
    onSuccess: () => {
      setStep("confirm");
    },
    onError: (err: Error) => {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    },
  });

  const copyNumber = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoggedIn) return null;
  if (isLoading || !service) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/40 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Order Placed!
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Your order is pending payment verification. We'll process it once we confirm your transaction.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/dashboard")}
              className="flex-1 py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-cyan-500/30 transition-all">
              View Orders
            </button>
            <button onClick={() => navigate("/services")}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all">
              Browse More
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060612]" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="h-16" />

      <div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <button onClick={() => step === "payment" ? setStep("details") : navigate(`/services/${id}`)}
          className="flex items-center gap-2 text-white/40 hover:text-cyan-400 text-sm transition-colors mb-10">
          <ArrowLeft size={16} /> {step === "payment" ? "Back to Details" : "Back to Service"}
        </button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {step === "details" && (
                <motion.div key="details" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                    Order Details
                  </h2>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-widest">Quantity</label>
                    <input
                      type="number"
                      min={service.minQuantity}
                      max={service.maxQuantity}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(service.minQuantity, Math.min(service.maxQuantity, parseInt(e.target.value) || service.minQuantity)))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 text-sm"
                      data-testid="input-quantity"
                    />
                    <p className="text-xs text-white/30 mt-1">Min: {service.minQuantity} · Max: {service.maxQuantity.toLocaleString()}</p>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-widest">Target Link / URL <span className="text-red-400">*</span></label>
                    <input
                      type="url"
                      value={link}
                      onChange={e => setLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 text-sm"
                      data-testid="input-link"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-widest">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any special instructions..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 text-sm resize-none"
                    />
                  </div>

                  <button
                    onClick={() => { if (!link) { toast({ title: "Target link required", variant: "destructive" }); return; } setStep("payment"); }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:opacity-90"
                  >
                    Continue to Payment <ChevronRight size={16} />
                  </button>
                </motion.div>
              )}

              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                    Payment
                  </h2>

                  {/* Method selector */}
                  <div>
                    <label className="block text-xs text-white/50 mb-3 uppercase tracking-widest">Select Payment Method</label>
                    <div className="grid grid-cols-3 gap-3">
                      {PAYMENT_METHODS.map(pm => (
                        <button
                          key={pm.id}
                          onClick={() => setPaymentMethod(pm.id as any)}
                          className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                            paymentMethod === pm.id
                              ? "border-opacity-60 text-white"
                              : "border-white/10 text-white/50 hover:border-white/20"
                          }`}
                          style={paymentMethod === pm.id ? { borderColor: pm.color, background: `${pm.color}20`, color: pm.color } : {}}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment instructions */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                    <p className="text-sm text-white font-semibold">Send <span className="text-cyan-400">${total}</span> to:</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-white text-sm">
                        {paymentNumber}
                      </div>
                      <button onClick={copyNumber} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
                        {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} className="text-white/50" />}
                      </button>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-yellow-400/80">
                      <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                      After sending, enter your Transaction ID below and submit.
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-widest">Transaction ID <span className="text-red-400">*</span></label>
                    <input
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                      placeholder="Enter your transaction ID"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 text-sm font-mono"
                      data-testid="input-transaction-id"
                    />
                  </div>

                  <button
                    onClick={() => { if (!transactionId.trim()) { toast({ title: "Transaction ID required", variant: "destructive" }); return; } mutation.mutate(); }}
                    disabled={mutation.isPending}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    {mutation.isPending ? "Placing Order..." : "Submit Order"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="md:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 sticky top-24">
              <h3 className="text-white font-semibold text-sm">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-white">{service.title}</div>
                <div className="text-white/40 text-xs">{service.category}</div>
              </div>
              <div className="border-t border-white/10 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-white/50">
                  <span>Price per order</span>
                  <span>${service.price}</span>
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>Quantity</span>
                  <span>{quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-cyan-400">${total}</span>
                </div>
              </div>
              <div className="text-xs text-white/30">Logged in as {user?.username}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
