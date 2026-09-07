import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Facebook } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function TeamSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="aspect-square" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="p-4 space-y-2">
        <div className="h-4 rounded w-3/4" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-3 rounded w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}

export default function Team() {
  const [clickedImages, setClickedImages] = useState<Set<string>>(new Set());

  const { data: settingsData } = useQuery({
    queryKey: ["/api/public/settings"],
    queryFn: () => fetch("/api/public/settings").then(r => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/public/team"],
    queryFn: () => fetch("/api/public/team").then(r => r.json()),
  });

  const settings = settingsData?.data || {};
  const members = data?.data || [];

  const sectionTitle = settings.team_title || "Meet Our Older Brother Cyber Expert";
  const sectionDescription = settings.team_description || "The minds behind Older Brother. Experts in their fields, united by a common goal.";

  const toggleImageColor = (memberId: string) => {
    setClickedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  return (
    <section id="team" className="py-24 bg-black/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">{sectionTitle}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{sectionDescription}</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => <TeamSkeleton key={i} />)}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <p className="text-sm">No team members to display.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
            {members.map((member: any, index: number) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                whileHover={{ y: -10 }}
                viewport={{ once: true }}
                className="group relative bg-card/30 border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 interactive"
                data-testid={`card-member-${member.id}`}
              >
                <div className="aspect-square overflow-hidden bg-white/5" data-testid={`img-container-${index}`}>
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleImageColor(member.id);
                      }}
                      className={`w-full h-full object-cover transition-all duration-500 cursor-pointer ${
                        clickedImages.has(member.id) ? '' : 'grayscale'
                      }`}
                      data-testid={`img-member-${index}`}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-6xl font-black text-white/20"
                      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(124,58,237,0.1))" }}
                    >
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="p-6 absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                  {member.facebookUrl ? (
                    <a
                      href={member.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xl font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer inline-block"
                      data-testid={`link-member-name-${index}`}
                    >
                      {member.name}
                    </a>
                  ) : (
                    <span className="text-xl font-bold text-white inline-block" data-testid={`text-member-name-${index}`}>
                      {member.name}
                    </span>
                  )}
                  <p className="text-secondary text-sm font-medium mb-4" data-testid={`text-member-role-${index}`}>
                    {member.position}
                  </p>

                  <div className="flex gap-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {member.facebookUrl && (
                      <a href={member.facebookUrl} target="_blank" rel="noreferrer" className="text-white/60 hover:text-blue-400 transition-colors" data-testid={`button-facebook-${index}`}>
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {member.twitterUrl && (
                      <a href={member.twitterUrl} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors" data-testid={`button-twitter-${index}`}>
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {member.linkedinUrl && (
                      <a href={member.linkedinUrl} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors" data-testid={`button-linkedin-${index}`}>
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {member.githubUrl && (
                      <a href={member.githubUrl} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors" data-testid={`button-github-${index}`}>
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
