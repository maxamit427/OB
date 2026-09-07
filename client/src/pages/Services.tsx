import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ShoppingCart, Star, Clock, ChevronRight, Search,
  Filter, Facebook, Instagram, Twitter, Globe, Zap,
  Youtube, Shield, X, CheckCircle, ArrowRight, MoreHorizontal
} from "lucide-react";
import { marketplaceApi } from "@/lib/marketplaceApi";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { Service, Category } from "@shared/schema";

const ICON_MAP: Record<string, any> = {
  Facebook, Instagram, Twitter, TikTok: Zap, Web3: Globe,
  YouTube: Youtube, All: Filter, Shield, Other: MoreHorizontal,
};

const PALETTE = [
  { card: "from-blue-900/40 to-blue-950/60 border-blue-600/30",   badge: "bg-blue-500/20 text-blue-300",   glow: "rgba(59,130,246,0.35)"  },
  { card: "from-pink-900/40 to-purple-950/60 border-pink-600/30",  badge: "bg-pink-500/20 text-pink-300",   glow: "rgba(236,72,153,0.35)"  },
  { card: "from-cyan-900/40 to-teal-950/60 border-cyan-600/30",    badge: "bg-cyan-500/20 text-cyan-300",   glow: "rgba(6,182,212,0.35)"   },
  { card: "from-sky-900/40 to-sky-950/60 border-sky-600/30",       badge: "bg-sky-500/20 text-sky-300",     glow: "rgba(14,165,233,0.35)"  },
  { card: "from-purple-900/40 to-violet-950/60 border-purple-600/30", badge: "bg-purple-500/20 text-purple-300", glow: "rgba(168,85,247,0.35)" },
  { card: "from-green-900/40 to-emerald-950/60 border-green-600/30",  badge: "bg-green-500/20 text-green-300",   glow: "rgba(34,197,94,0.35)"  },
  { card: "from-orange-900/40 to-amber-950/60 border-orange-600/30",  badge: "bg-orange-500/20 text-orange-300", glow: "rgba(249,115,22,0.35)" },
  { card: "from-rose-900/40 to-pink-950/60 border-rose-600/30",    badge: "bg-rose-500/20 text-rose-300",   glow: "rgba(244,63,94,0.35)"  },
];

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch]                 = useState("");
  const [detail, setDetail]                 = useState<Service | null>(null);
  const { settings } = useSiteSettings();

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/marketplace/services"],
    queryFn:  () => marketplaceApi.getServices(),
  });

  const { data: catsData, isLoading: catsLoading } = useQuery({
    queryKey: ["/api/public/categories"],
    queryFn:  () => fetch("/api/public/categories").then(r => r.json()),
  });

  const isLoading = servicesLoading || catsLoading;

  const services: Service[] = (servicesData?.data ?? []).filter((s: Service) => s.isActive);

  // DB categories (admin-managed, visible only)
  const dbCategories: Category[] = (catsData?.data ?? []).filter((c: Category) => c.isVisible);

  // Set of all DB category titles
  const dbTitles = new Set(dbCategories.map((c: Category) => c.title));

  // DB categories that have ≥1 active service matching by name (deduplicated by title)
  const matchedDbCats = Array.from(
    new Map(
      dbCategories
        .filter((c: Category) => services.some((s: Service) => s.category === c.title))
        .map((c: Category) => [c.title, c.title])
    ).values()
  );

  // Final tab list: DB-matched categories + always show "Other"
  const allCategoryTabs: string[] = [
    ...matchedDbCats,
    "Other",
  ];

  // Assign palette color per category (Other always gets the last palette slot)
  const paletteMap: Record<string, typeof PALETTE[0]> = {};
  matchedDbCats.forEach((name, i) => {
    paletteMap[name] = PALETTE[i % (PALETTE.length - 1)];
  });
  paletteMap["Other"] = PALETTE[PALETTE.length - 1];

  const filtered = services.filter((s: Service) => {
    let matchesCat: boolean;
    if (activeCategory === "All") {
      matchesCat = true;
    } else if (activeCategory === "Other") {
      // "Other" = any service whose category is not a known DB category
      matchesCat = !!(s.category && !dbTitles.has(s.category));
    } else {
      matchesCat = s.category === activeCategory;
    }
    const matchesSearch = !search
      || s.title.toLowerCase().includes(search.toLowerCase())
      || s.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const badgeText = settings.marketplace_badge || "Digital Services Marketplace";
  const titleText = settings.marketplace_title  || "Premium Digital Services";
  const subText   = settings.marketplace_subtitle || "Professional growth, security, and Web3 advisory services — delivered by experts.";

  return (
    <div className="min-h-screen bg-[#060612]" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="h-16" />

      {/* Hero */}
      <section className="relative pt-20 pb-14 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-cyan-500/5 blur-[80px] rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-5">
              <ShoppingCart size={12} /> {badgeText}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {titleText.split(" ")[0]}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                {titleText.split(" ").slice(1).join(" ")}
              </span>
            </h1>
            <p className="text-white/45 max-w-lg mx-auto text-sm sm:text-base">{subText}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="mt-6 max-w-md mx-auto relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/40 text-sm transition-colors"
            />
          </motion.div>
        </div>
      </section>

      {/* Category filter */}
      <section className="px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {[...Array(5)].map((_, i) => <div key={i} className="w-24 h-9 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {(["All", ...allCategoryTabs] as string[]).map((cat, i) => {
                const Icon   = ICON_MAP[cat] ?? Shield;
                const active = activeCategory === cat;
                const pal    = paletteMap[cat];
                return (
                  <motion.button
                    key={cat}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      active
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.3)]"
                        : "bg-white/4 border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    <Icon size={13} /> {cat}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Service grid */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-white/4 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-white/25">
              <ShoppingCart size={44} className="mx-auto mb-3 opacity-25" />
              <p>কোনো সার্ভিস পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((service, i) => {
                const pal = paletteMap[service.category] ?? PALETTE[0];
                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    index={i}
                    palette={pal}
                    onDetail={() => setDetail(service)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="text-center pb-10">
        <Link href="/" className="text-white/25 hover:text-cyan-400 text-sm transition-colors">
          ← Back to Home
        </Link>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <ServiceDetailModal service={detail} palette={paletteMap[detail.category] ?? PALETTE[0]} onClose={() => setDetail(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Service Card ─────────────────────────────────────────────────────────── */
function ServiceCard({ service, index, palette, onDetail }: {
  service: Service; index: number; palette: typeof PALETTE[0]; onDetail: () => void;
}) {
  const features: string[] = JSON.parse(service.features || "[]");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: `0 16px 40px ${palette.glow}` }}
      whileTap={{ scale: 0.96 }}
      onClick={onDetail}
      className={`group relative bg-gradient-to-br ${palette.card} border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-shadow duration-300 select-none`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${palette.badge}`}>
            {service.category}
          </span>
          <h3 className="mt-2 text-white font-semibold text-base leading-snug line-clamp-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            {service.title}
          </h3>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-cyan-400 font-bold text-lg">${service.price}</div>
          <div className="text-white/30 text-[11px]">per order</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/45 text-xs leading-relaxed line-clamp-2">{service.description}</p>

      {/* Features */}
      {features.length > 0 && (
        <ul className="space-y-1">
          {features.slice(0, 3).map((f, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px] text-white/35">
              <Star size={9} className="text-cyan-500 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/8">
        <div className="flex items-center gap-1 text-white/25 text-xs">
          <Clock size={10} /> {service.deliveryTime}
        </div>

        <motion.span
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1 text-xs text-cyan-400 font-semibold group-hover:gap-2 transition-all"
        >
          Details <ChevronRight size={12} />
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ── Detail Modal ─────────────────────────────────────────────────────────── */
function ServiceDetailModal({ service, palette, onClose }: {
  service: Service; palette: typeof PALETTE[0]; onClose: () => void;
}) {
  const features: string[] = JSON.parse(service.features || "[]");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      {/* outer shell — gradient bg, border, rounded, glow shadow */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0,  opacity: 1, scale: 1    }}
        exit={{    y: 60, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        className={`w-full sm:max-w-md bg-gradient-to-br ${palette.card} border rounded-t-3xl sm:rounded-2xl`}
        style={{ boxShadow: `0 16px 48px ${palette.glow}` }}
      >
        {/* inner scroll wrapper — clips content inside rounded corners */}
        <div className="max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${palette.badge}`}>
              {service.category}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Title + Price */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-white font-bold text-xl leading-snug" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {service.title}
              </h2>
              <div className="text-right flex-shrink-0">
                <div className="text-cyan-400 font-bold text-2xl">${service.price}</div>
                <div className="text-white/30 text-xs">per order</div>
              </div>
            </div>

            {/* Working Time */}
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Clock size={13} className="text-cyan-500" /> Working Time: {service.deliveryTime}
            </div>

            {/* Description */}
            <p className="text-white/60 text-sm leading-relaxed">
              {service.longDescription || service.description}
            </p>

            {/* Features */}
            {features.length > 0 && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">What's included</p>
                <ul className="space-y-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                      <CheckCircle size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link
                href={`/services/${service.id}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)", boxShadow: `0 8px 24px ${palette.glow}` }}
              >
                Order Now <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>

        </div>{/* end inner scroll wrapper */}
      </motion.div>
    </motion.div>
  );
}
