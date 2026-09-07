import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

export default function Hero() {
  const { settings } = useSiteSettings();

  const logoSrc       = settings.logo_url || logoFallback;
  const logoLink      = settings.hero_logo_link || "https://www.facebook.com/OlderBrotherofficiall";
  const badgeText     = settings.hero_badge_text || "Next Gen Digital Guidance";
  const headline      = settings.hero_headline || "Protecting Your Digital Legacy";
  const subheadline   = settings.hero_subheadline || "We are the OLDER BROTHER Team.";
  const secNotice     = settings.hero_security_notice || "";
  const ctaPrimary    = settings.hero_cta_primary || "Start Conversation";
  const ctaSecondary  = settings.hero_cta_secondary || "View Work";

  // Parse headline: first part plain, last word(s) gradient if contains "Digital"
  const headlineParts = headline.split("Digital");
  const hasGradientWord = headline.includes("Digital");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex flex-col items-start">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6"
            >
              <span className="text-xs font-tech uppercase tracking-widest text-cyan-400">
                {badgeText}
              </span>
            </motion.div>

            {/* Logo (single source) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center self-start ml-4 mb-8"
            >
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden mb-3"
                data-testid="hero-logo"
              >
                <img
                  src={logoSrc}
                  alt="Older Brother Logo"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "auto" }}
                />
              </div>
              {/* Security notice — only shown if non-empty */}
              {secNotice.trim() && (
                <p className="text-amber-400 font-tech font-bold tracking-wider text-sm uppercase text-center max-w-[250px] animate-pulse">
                  {secNotice}
                </p>
              )}
            </motion.div>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-heading font-bold leading-tight mb-6"
            data-testid="hero-headline"
          >
            {hasGradientWord ? (
              <>
                {headlineParts[0]}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-transparent bg-clip-text">
                  Digital
                </span>
                {headlineParts[1]}
              </>
            ) : (
              headline
            )}
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed"
            data-testid="hero-subheadline"
          >
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-medium transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] interactive"
              data-testid="hero-cta-primary"
            >
              {ctaPrimary}
            </button>
            <button
              onClick={() => document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-transparent border border-cyan-400/30 hover:bg-cyan-400/10 text-white px-8 py-3 rounded-full font-medium transition-all interactive"
              data-testid="hero-cta-secondary"
            >
              {ctaSecondary}
            </button>
          </div>
        </motion.div>

        <div className="hidden md:block" />
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <ArrowDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}
