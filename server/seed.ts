import { storage } from "./storage";

export async function seedIfEmpty() {
  try {
    const existing = await storage.getCategories();
    if (existing.length > 0) return;

    const defaultCategories = [
      { title: "Facebook",    subtitle: "Social Media",  description: "Facebook page likes, account recovery, Meta verification and brand protection.",  icon: "Facebook",      color: "text-blue-400",   order: 0, imageUrl: "", type: "service", isVisible: true },
      { title: "Instagram",   subtitle: "Social Media",  description: "Grow your Instagram followers, likes, and engagement organically.",                icon: "MessageSquare", color: "text-pink-400",   order: 1, imageUrl: "", type: "service", isVisible: true },
      { title: "TikTok",      subtitle: "Social Media",  description: "Boost TikTok followers and video views to expand your reach and virality.",        icon: "Zap",           color: "text-cyan-400",   order: 2, imageUrl: "", type: "service", isVisible: true },
      { title: "Twitter / X", subtitle: "Social Media",  description: "Build your Twitter/X presence with quality followers and engagement boosts.",      icon: "Globe",         color: "text-sky-400",    order: 3, imageUrl: "", type: "service", isVisible: true },
      { title: "Web3",        subtitle: "Blockchain",    description: "Web3 wallet security, DeFi advisory, and smart contract security consultations.",  icon: "Cpu",           color: "text-purple-400", order: 4, imageUrl: "", type: "service", isVisible: true },
      { title: "YouTube",     subtitle: "Video Platform", description: "Grow your YouTube channel with subscribers, views, likes, and engagement services.",  icon: "Youtube",       color: "text-red-400",    order: 5, imageUrl: "", type: "service", isVisible: true },
      { title: "Security",   subtitle: "Cyber Security", description: "Account protection, password recovery, and cybersecurity consulting services.",    icon: "Shield",        color: "text-green-400",  order: 6, imageUrl: "", type: "service", isVisible: true },
    ];

    for (const cat of defaultCategories) {
      await storage.createCategory(cat as any);
    }

    console.log("[seed] Created 6 default categories ✓");
  } catch (err) {
    console.warn("[seed] Could not seed categories:", (err as Error).message);
  }
}
