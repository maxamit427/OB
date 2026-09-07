import { motion } from "framer-motion";
import { Mail, MapPin, Facebook } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Contact() {
  const { settings } = useSiteSettings();

  const label       = settings.contact_label       || "Get in Touch";
  const title       = settings.contact_title       || "Ready to secure your digital future?";
  const description = settings.contact_description || "Reach out to the Older Brother Team for a consultation.";
  const email       = settings.contact_email       || "olderbrotherofficial@yahoo.com";
  const location    = settings.contact_location    || "Decentralized & Remote";
  const fbUrl       = settings.contact_facebook_url || "https://www.facebook.com/OlderBrotherofficiall";
  const fbCta       = settings.contact_facebook_cta || "Visit Our Facebook Page";

  return (
    <section id="contact" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span
              className="text-cyan-400 font-tech uppercase tracking-widest text-sm mb-2 block"
              data-testid="contact-label"
            >
              {label}
            </span>
            <h2
              className="text-3xl md:text-5xl font-heading font-bold mb-6"
              data-testid="contact-title"
            >
              {title}
            </h2>
            <p
              className="text-muted-foreground mb-10 text-lg"
              data-testid="contact-description"
            >
              {description}
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Email Us</h4>
                  <p className="text-muted-foreground" data-testid="contact-email">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Global HQ</h4>
                  <p className="text-muted-foreground" data-testid="contact-location">{location}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 rounded-3xl text-center"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-400/10 flex items-center justify-center mx-auto mb-6">
              <Facebook className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Connect With Us</h3>
            <p className="text-muted-foreground mb-8">
              Visit our Facebook page for the latest updates, support, and direct communication with our team.
            </p>
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 interactive"
              data-testid="link-facebook"
            >
              <Facebook className="w-5 h-5" />
              {fbCta}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
