import { motion } from "framer-motion";
import { Calendar, Shield, Users, Trophy } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const milestones = [
  { year: "2020", title: "Foundation",       description: "Older Brother Team established with a mission to secure digital identities.",             icon: Shield   },
  { year: "2021", title: "Community Growth", description: "Expanded services to support growing digital communities and creators.",                  icon: Users    },
  { year: "2023", title: "Web3 Integration", description: "Adopted blockchain technologies for enhanced copyright verification.",                    icon: Trophy   },
  { year: "2025", title: "Global Reach",     description: "Now serving clients worldwide with 24/7 support and guidance.",                           icon: Calendar },
];

export default function About() {
  const { settings } = useSiteSettings();

  const title       = settings.about_title       || "Our Journey";
  const description = settings.about_description || "From humble beginnings to digital guardians. We've evolved alongside the internet to provide cutting-edge protection and support.";

  return (
    <section id="about" className="py-24 bg-black/20 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-heading font-bold mb-4"
            data-testid="about-title"
          >
            {title.includes(" ") ? (
              <>
                {title.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-transparent bg-clip-text drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                  {title.split(" ").slice(-1)[0]}
                </span>
              </>
            ) : (
              title
            )}
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 80 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 mx-auto rounded-full shadow-[0_0_20px_rgba(249,115,22,0.5)]"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 text-muted-foreground max-w-2xl mx-auto"
            data-testid="about-description"
          >
            {description}
          </motion.p>
        </motion.div>

        <div className="relative">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gradient-to-b from-transparent via-orange-500/50 to-transparent hidden md:block origin-top shadow-[0_0_10px_rgba(249,115,22,0.3)]"
          />

          <div className="space-y-12 md:space-y-24">
            {milestones.map((item, index) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: index % 2 === 0 ? 100 : -100, y: 50 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 50 }}
                className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}
              >
                <motion.div
                  className="flex-1 w-full"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`glass-card p-8 rounded-2xl relative overflow-hidden group ${index % 2 === 0 ? "md:text-left" : "md:text-right"} hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all duration-500`}>
                    <div className={`absolute top-0 ${index % 2 === 0 ? "left-0" : "right-0"} w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -translate-y-1/2 group-hover:bg-orange-500/30 transition-all duration-500`} />
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 0.1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.15 + 0.3 }}
                      className="text-4xl font-tech font-bold text-orange-500 absolute top-4 right-4 group-hover:text-orange-400 transition-colors"
                    >
                      {item.year}
                    </motion.span>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3 md:inline-flex group-hover:text-orange-400 transition-colors duration-300">
                      {index % 2 !== 0 && <item.icon className="w-5 h-5 text-orange-500 md:hidden" />}
                      {item.title}
                      {index % 2 === 0 && <item.icon className="w-5 h-5 text-orange-500 md:hidden" />}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 + 0.2, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full bg-background border border-orange-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:shadow-[0_0_30px_rgba(249,115,22,0.8)] transition-all duration-300">
                    <item.icon className="w-5 h-5 text-orange-500" />
                  </div>
                </motion.div>

                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
