import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function PortfolioSkeleton() {
  return (
    <div className="aspect-video rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
  );
}

const FALLBACK_IMAGES: Record<string, string> = {
  "Security": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop",
  "Copyright": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
  "Facebook Support": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=800&auto=format&fit=crop",
  "Community": "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=800&auto=format&fit=crop",
  "Web3": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop",
  "default": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
};

export default function Portfolio() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: ["/api/public/settings"],
    queryFn: () => fetch("/api/public/settings").then(r => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/public/portfolio"],
    queryFn: () => fetch("/api/public/portfolio").then(r => r.json()),
  });

  const settings = settingsData?.data || {};
  const items = data?.data || [];

  const sectionTitle = settings.portfolio_title || "Selected Works";
  const sectionDescription = settings.portfolio_description || "Showcasing our impact across the digital landscape.";

  const selected = items.find((p: any) => p.id === selectedId);

  const getImage = (item: any) => {
    if (item.imageUrl) return item.imageUrl;
    return FALLBACK_IMAGES[item.category] || FALLBACK_IMAGES["default"];
  };

  let tags: string[] = [];
  if (selected) {
    try { tags = JSON.parse(selected.tags || "[]"); } catch {}
  }

  return (
    <section id="portfolio" className="py-24 bg-black/20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6"
        >
          <div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-transparent bg-clip-text drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                {sectionTitle}
              </span>
            </h2>
            <p className="text-muted-foreground max-w-md">{sectionDescription}</p>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => <PortfolioSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <p className="text-sm">No portfolio items to display.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {items.map((project: any, index: number) => (
              <motion.div
                key={project.id}
                layoutId={`card-${project.id}`}
                onClick={() => setSelectedId(project.id)}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2, type: "spring", stiffness: 100 }}
                className="group relative aspect-video overflow-hidden rounded-2xl cursor-pointer interactive"
                whileHover={{ scale: 1.05, y: -10 }}
                data-testid={`card-portfolio-${project.id}`}
              >
                <motion.img
                  src={getImage(project)}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.15 }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                <motion.div className="absolute inset-0 border-2 border-orange-500/0 group-hover:border-orange-500/50 rounded-2xl transition-all duration-300 shadow-[0_0_0_rgba(249,115,22,0)] group-hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]" />

                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <motion.span
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.3 }}
                    className="text-orange-500 text-xs font-tech uppercase tracking-widest mb-2 block drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                  >
                    {project.category}
                  </motion.span>
                  <motion.h3
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 + 0.4 }}
                    className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  >
                    {project.title}
                  </motion.h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedId && selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                layoutId={`card-${selectedId}`}
                className="w-full max-w-2xl bg-[#0b0b14] border border-white/10 rounded-3xl overflow-hidden relative z-10"
              >
                <div className="relative h-64 md:h-80">
                  <img
                    src={getImage(selected)}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors interactive"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-secondary text-xs font-tech uppercase tracking-widest mb-2 block">
                        {selected.category}
                      </span>
                      <h3 className="text-3xl font-heading font-bold text-white">{selected.title}</h3>
                    </div>
                    {selected.liveUrl && (
                      <a
                        href={selected.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-3 border border-white/10 rounded-full hover:bg-primary hover:border-primary transition-colors interactive"
                      >
                        <ExternalLink className="w-5 h-5 text-white" />
                      </a>
                    )}
                  </div>

                  <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                    {selected.description}
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tags.map((tag: string) => (
                        <span key={tag} className="text-xs px-3 py-1 rounded-full text-orange-400 border border-orange-500/30" style={{ background: "rgba(249,115,22,0.08)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                    <div>
                      <span className="block text-xs text-white/40 uppercase mb-1">Client</span>
                      <span className="text-white font-medium">Confidential</span>
                    </div>
                    <div>
                      <span className="block text-xs text-white/40 uppercase mb-1">Category</span>
                      <span className="text-white font-medium">{selected.category}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-white/40 uppercase mb-1">Featured</span>
                      <span className="text-white font-medium">{selected.featured ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
