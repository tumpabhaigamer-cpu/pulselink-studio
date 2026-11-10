export type PulseTemplate = {
  slug: string;
  name: string;
  category: string;
  mode: "EASY_OS" | "NEON_FUNNEL";
  image: string;
  video: string;
  accent: string;
  eyebrow: string;
  headline: string[];
  description: string;
  location: string;
  primary: string;
  secondary: string;
  tags: string[];
};

export const PULSE_TEMPLATES: PulseTemplate[] = [
  { slug: "onyx-fitness", name: "ONYX Athletics", category: "FITNESS & WELLNESS", mode: "NEON_FUNNEL", image: "/images/demo-gym.jpg", video: "https://videos.pexels.com/video-files/29569363/12727658_1080_1920_60fps.mp4", accent: "#c7ff4d", eyebrow: "MUMBAI  /  EST. 2024", headline: ["BUILT FOR", "MORE."], description: "Not just a workout. A stronger way of life. Find your people, find your power.", location: "Bandra West, Mumbai", primary: "Claim your free pass", secondary: "Take the studio tour", tags: ["PERSONAL TRAINING", "STRENGTH", "COMMUNITY"] },
  { slug: "morrow-house", name: "Morrow House", category: "CAFÉ & HOSPITALITY", mode: "NEON_FUNNEL", image: "/images/demo-cafe.jpg", video: "https://videos.pexels.com/video-files/35035084/14840929_1080_1920_30fps.mp4", accent: "#ffb98e", eyebrow: "SINGAPORE  /  ALL DAY", headline: ["GOOD DAYS", "START HERE."], description: "Thoughtful coffee, slow mornings, and a little room to stay awhile.", location: "Tiong Bahru, Singapore", primary: "Book a table", secondary: "Explore the space", tags: ["SPECIALTY COFFEE", "ALL-DAY BRUNCH", "GOOD COMPANY"] },
  { slug: "alex-rivera", name: "Alex Rivera", category: "CREATOR & DEVELOPER", mode: "EASY_OS", image: "/images/demo-creator.jpg", video: "https://videos.pexels.com/video-files/39645503/16901721_1080_1920_30fps.mp4", accent: "#c7ff4d", eyebrow: "INDEPENDENT CREATIVE  /  ONLINE", headline: ["MAKING", "DIGITAL FEEL."], description: "Design, code, and a little bit of internet magic. Welcome to my corner of the web.", location: "Available worldwide", primary: "Start a project", secondary: "Explore my work", tags: ["DESIGN SYSTEMS", "DEVELOPMENT", "MOTION"] },
];

export const getPulseTemplate = (slug: string) => PULSE_TEMPLATES.find((template) => template.slug === slug);
