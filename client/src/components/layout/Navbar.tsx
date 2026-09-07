import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShoppingBag, User, LogOut, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

const NAV_LINKS = [
  { name: "About",     href: "#about"     },
  { name: "Services",  href: "#services"  },
  { name: "Portfolio", href: "#portfolio" },
  { name: "Team",      href: "#team"      },
  { name: "Contact",   href: "#contact"   },
];

export default function Navbar() {
  const [isScrolled,      setIsScrolled]      = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen,    setUserMenuOpen]    = useState(false);
  const { settings } = useSiteSettings();
  const { isLoggedIn, user, logout } = usePublicAuth();
  const [, navigate] = useLocation();

  const logoSrc   = settings.logo_url || logoFallback;
  const brandName = settings.nav_brand_name || "OLDER BROTHER";
  const fbUrl     = settings.contact_facebook_url || "https://www.facebook.com/OlderBrotherofficiall";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [userMenuOpen]);

  const handleNavClick = (href: string) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else {
      // If on a non-home page, navigate home first, then scroll
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "py-3 bg-background/80 backdrop-blur-md border-b border-white/5" : "py-6 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 interactive flex-shrink-0"
          style={{ cursor: "pointer" }}
          onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          data-testid="navbar-brand"
        >
          <div className="relative w-9 h-9 overflow-hidden rounded-full flex-shrink-0">
            <img
              src={logoSrc}
              alt={brandName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-sm tracking-widest text-white whitespace-nowrap uppercase">
              {brandName}
            </span>
            <span className="text-cyan-400/60 tracking-widest hidden sm:block" style={{ fontSize: 9, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>
              TEAM
            </span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => handleNavClick(link.href)}
              className="text-sm font-medium text-white/70 hover:text-secondary transition-colors interactive relative group"
              data-testid={`nav-link-${link.name.toLowerCase()}`}
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
            </button>
          ))}

          {/* Marketplace link */}
          <Link
            href="/services"
            className="flex items-center gap-1.5 text-sm font-medium text-cyan-400/80 hover:text-cyan-300 transition-colors interactive"
            data-testid="nav-marketplace"
          >
            <ShoppingBag size={14} /> Marketplace
          </Link>

          {/* Auth / User */}
          {isLoggedIn ? (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setUserMenuOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white transition-all"
                data-testid="nav-user-menu"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="max-w-[80px] truncate">{user?.name}</span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#0d0d1a] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all">
                      <LayoutDashboard size={14} /> My Orders
                    </Link>
                    <Link href="/services" className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all">
                      <ShoppingBag size={14} /> Marketplace
                    </Link>
                    <div className="border-t border-white/10" />
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all"
                      data-testid="nav-logout"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-full text-sm transition-all"
              data-testid="nav-signin"
            >
              <User size={14} /> Sign In
            </Link>
          )}

          <button
            onClick={() => handleNavClick(fbUrl)}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(112,0,255,0.3)] interactive"
            data-testid="nav-cta"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white interactive"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="nav-mobile-toggle"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link.href)}
                  className="text-left text-lg font-medium text-white/80 hover:text-primary py-2 border-b border-white/5"
                  data-testid={`mobile-nav-${link.name.toLowerCase()}`}
                >
                  {link.name}
                </button>
              ))}
              <Link
                href="/services"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-lg font-medium text-cyan-400 py-2 border-b border-white/5"
              >
                <ShoppingBag size={16} /> Marketplace
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium text-white/80 hover:text-primary py-2 border-b border-white/5">
                    My Orders
                  </Link>
                  <button onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="text-left text-lg font-medium text-red-400 py-2">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-white/80 hover:text-primary py-2">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
