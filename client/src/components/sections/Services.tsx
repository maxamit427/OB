import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  Shield: LucideIcons.Shield,
  ShieldCheck: LucideIcons.ShieldCheck,
  ShieldOff: LucideIcons.ShieldOff,
  Lock: LucideIcons.Lock,
  Globe: LucideIcons.Globe,
  Facebook: LucideIcons.Facebook,
  Scale: LucideIcons.Scale,
  BadgeCheck: LucideIcons.BadgeCheck,
  Trash2: LucideIcons.Trash2,
  TrendingUp: LucideIcons.TrendingUp,
  UserX: LucideIcons.UserX,
  PauseCircle: LucideIcons.PauseCircle,
  MessageSquare: LucideIcons.MessageSquare,
  Users: LucideIcons.Users,
  Star: LucideIcons.Star,
  Zap: LucideIcons.Zap,
  Eye: LucideIcons.Eye,
  Key: LucideIcons.Key,
  Cpu: LucideIcons.Cpu,
  AlertTriangle: LucideIcons.AlertTriangle,
  CheckCircle: LucideIcons.CheckCircle,
  Search: LucideIcons.Search,
  Settings: LucideIcons.Settings,
  Code: LucideIcons.Code,
};

// Fallback shimmer skeletons
function ServiceSkeleton() {
  return (
    <div className="glass-card p-8 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="w-12 h-12 rounded-lg mb-6" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-5 rounded mb-3 w-3/4" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-3 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-3 rounded w-5/6" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

export default function Services() {
  const { data: settingsData } = useQuery({
    queryKey: ["/api/public/settings"],
    queryFn: () => fetch("/api/public/settings").then(r => r.json()),
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["/api/public/categories"],
    queryFn: () => fetch("/api/public/categories").then(r => r.json()),
  });

  const settings = settingsData?.data || {};
  const categories = (categoriesData?.data || []).filter((c: any) => c.isVisible);

  const sectionTitle = settings.services_title || "Premium Digital Services";
  const sectionSubtitle = settings.services_subtitle || "What We Do";
  const sectionDescription = settings.services_description || "We provide the shield and the sword for your online presence. Expert tools and strategies for the modern web.";

  return (
    <section id="services" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-orange-500 font-tech uppercase tracking-widest text-sm mb-2 block">
            {sectionSubtitle}
          </span>
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-transparent bg-clip-text drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">
              {sectionTitle}
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {sectionDescription}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <ServiceSkeleton key={i} />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <p className="text-sm">No services configured yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat: any, index: number) => {
              const IconComponent = iconMap[cat.icon] || LucideIcons.Shield;
              const iconColor = cat.color || "text-cyan-400";
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.5, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -15, scale: 1.05 }}
                  className="glass-card p-8 rounded-2xl group interactive hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all duration-300"
                >
                  {cat.imageUrl ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08 + 0.2, duration: 0.6, type: "spring", stiffness: 200 }}
                      className="w-12 h-12 rounded-lg overflow-hidden mb-6 group-hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all duration-300"
                    >
                      <img src={cat.imageUrl} alt={cat.title} className="w-full h-full object-cover" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08 + 0.2, duration: 0.6, type: "spring", stiffness: 200 }}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-all duration-300 border border-white/5 group-hover:shadow-[0_0_25px_rgba(249,115,22,0.5)]"
                    >
                      <IconComponent className={`w-6 h-6 ${iconColor} group-hover:drop-shadow-[0_0_12px_rgba(249,115,22,1)]`} />
                    </motion.div>
                  )}

                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 + 0.3 }}
                    className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors duration-300"
                  >
                    {cat.title}
                  </motion.h3>

                  {cat.subtitle && (
                    <p className={`text-xs font-tech uppercase tracking-widest mb-2 ${iconColor}`}>{cat.subtitle}</p>
                  )}

                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 + 0.4 }}
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    {cat.description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 + 0.5 }}
                    className="mt-6 pt-6 border-t border-white/5 flex items-center text-xs font-medium text-white/50 uppercase tracking-wider group-hover:text-orange-500 transition-colors"
                  >
                    Learn More
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
