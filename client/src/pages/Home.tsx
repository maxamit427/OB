import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Portfolio from "@/components/sections/Portfolio";
import Web3Showcase from "@/components/sections/Web3Showcase";
import Team from "@/components/sections/Team";
import Contact from "@/components/sections/Contact";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import "./SolarSystemBackground.css";

export default function Home() {
  const [scrollZoom, setScrollZoom] = useState(1.8);
  const solarContainerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSiteSettings();

  const copyrightText = settings.footer_copyright || "Older Brother Team. All rights reserved.";
  const creditText    = settings.footer_credit    || "Design & Development by Amit Max";

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition  = window.scrollY;
      const maxScroll       = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = Math.min(scrollPosition / maxScroll, 1);
      setScrollZoom(1.8 - scrollPercentage * 0.8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!solarContainerRef.current) return;
    const container = solarContainerRef.current;
    const stars: HTMLDivElement[] = [];
    for (let i = 0; i < 200; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 2 + 1;
      star.style.width  = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top    = Math.random() * 100 + "%";
      star.style.left   = Math.random() * 100 + "%";
      star.style.opacity = `${Math.random() * 0.5 + 0.5}`;
      container.appendChild(star);
      stars.push(star);
    }
    return () => { stars.forEach(s => s.remove()); };
  }, []);

  return (
    <div className="min-h-screen bg-black text-foreground selection:bg-primary selection:text-white relative overflow-x-hidden">
      {/* Solar System Background */}
      <div
        ref={solarContainerRef}
        className="solar-system-background fixed inset-0 pointer-events-none will-change-transform"
        style={{ transform: `scale(${scrollZoom})`, transition: "transform 0.1s ease-out", zIndex: 0 }}
      >
        <div className="container">
          <div className="sun"><img src="/images/sun.png" alt="sun" /></div>
          <div className="mercury"></div>
          <div className="venus"></div>
          <div className="earth"><div className="moon"></div></div>
          <div className="mars"></div>
          <div className="jupiter"></div>
          <div className="saturn"></div>
          <div className="uranus"></div>
          <div className="neptune"></div>
          <div className="pluto"></div>
          <div className="planet-x"></div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <About />
          <Services />
          <Web3Showcase />
          <Portfolio />
          <Team />
          <Contact />
        </main>

        <footer className="py-8 border-t border-white/5 text-center text-white/30 text-sm" data-testid="footer">
          <div className="container mx-auto space-y-3">
            <p data-testid="footer-copyright">
              © {new Date().getFullYear()} {copyrightText}
            </p>
            {creditText && (
              <p className="text-cyan-400/60 text-xs" data-testid="footer-credit">
                {creditText}
              </p>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
