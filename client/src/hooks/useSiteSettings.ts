import { useQuery } from "@tanstack/react-query";

export interface SiteSettings {
  site_title:            string;
  site_description:      string;
  logo_url:              string;
  nav_brand_name:        string;
  hero_badge_text:       string;
  hero_headline:         string;
  hero_subheadline:      string;
  hero_security_notice:  string;
  hero_cta_primary:      string;
  hero_cta_secondary:    string;
  hero_logo_link:        string;
  about_title:           string;
  about_description:     string;
  services_title:        string;
  services_subtitle:     string;
  services_description:  string;
  team_title:            string;
  team_description:      string;
  portfolio_title:       string;
  portfolio_description: string;
  contact_label:         string;
  contact_title:         string;
  contact_description:   string;
  contact_email:         string;
  contact_location:      string;
  contact_facebook_url:  string;
  contact_facebook_cta:  string;
  footer_copyright:      string;
  footer_credit:         string;
  twitter_url:           string;
  instagram_url:         string;
  telegram_url:          string;
  seo_keywords:          string;
  maintenance_mode:      string;
  marketplace_badge:     string;
  marketplace_title:     string;
  marketplace_subtitle:  string;
  bkash_number:          string;
  nagad_number:          string;
  rocket_number:         string;
}

const DEFAULTS: SiteSettings = {
  site_title:            "Older Brother Team",
  site_description:      "Web3 Digital Security Platform",
  logo_url:              "",
  nav_brand_name:        "OLDER BROTHER",
  hero_badge_text:       "Next Gen Digital Guidance",
  hero_headline:         "Protecting Your Digital Legacy",
  hero_subheadline:      "We are the OLDER BROTHER Team. Navigating the complexities of Facebook support, copyright protection, and community growth with Web3 precision.",
  hero_security_notice:  "",
  hero_cta_primary:      "Start Conversation",
  hero_cta_secondary:    "View Work",
  hero_logo_link:        "https://www.facebook.com/OlderBrotherofficiall",
  about_title:           "Our Journey",
  about_description:     "From humble beginnings to digital guardians. We've evolved alongside the internet to provide cutting-edge protection and support.",
  services_title:        "Premium Digital Services",
  services_subtitle:     "What We Do",
  services_description:  "We provide the shield and the sword for your online presence.",
  team_title:            "Meet Our Older Brother Cyber Expert",
  team_description:      "The minds behind Older Brother. Experts in their fields, united by a common goal.",
  portfolio_title:       "Selected Works",
  portfolio_description: "Showcasing our impact across the digital landscape.",
  contact_label:         "Get in Touch",
  contact_title:         "Ready to secure your digital future?",
  contact_description:   "Reach out to the Older Brother Team for a consultation. We are ready to assist with your digital needs.",
  contact_email:         "olderbrotherofficial@yahoo.com",
  contact_location:      "Decentralized & Remote",
  contact_facebook_url:  "https://www.facebook.com/OlderBrotherofficiall",
  contact_facebook_cta:  "Visit Our Facebook Page",
  footer_copyright:      "Older Brother Team. All rights reserved.",
  footer_credit:         "Design & Development by Amit Max",
  twitter_url:           "",
  instagram_url:         "",
  telegram_url:          "",
  seo_keywords:          "Web3, Digital Security, Facebook Support",
  maintenance_mode:      "false",
  marketplace_badge:     "Digital Services Marketplace",
  marketplace_title:     "Premium Digital Services",
  marketplace_subtitle:  "Professional growth, security, and Web3 advisory services — delivered by experts.",
  bkash_number:          "",
  nagad_number:          "",
  rocket_number:         "",
};

async function fetchPublicSettings(): Promise<SiteSettings> {
  const res = await fetch("/api/public/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const json = await res.json();
  return { ...DEFAULTS, ...(json.data ?? {}) };
}

export function useSiteSettings() {
  const { data, isLoading } = useQuery<SiteSettings>({
    queryKey:     ["/api/public/settings"],
    queryFn:      fetchPublicSettings,
    staleTime:    1000 * 30,
    refetchOnWindowFocus: true,
  });

  return { settings: data ?? DEFAULTS, isLoading };
}
