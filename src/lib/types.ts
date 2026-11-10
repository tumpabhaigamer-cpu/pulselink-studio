export type ThemeConfig = {
  preset: string;
  background: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: string;
  showLogo: boolean;
  fontFamily?: "DM Sans" | "Manrope" | "Georgia";
  buttonShadow?: "none" | "soft" | "hard";
  gradientEnd?: string;
  layoutMode?: "EASY_OS" | "NEON_FUNNEL";
  motion?: boolean;
  glow?: boolean;
  accentColor?: string;
  motionPreset?: "NEON_CYBER" | "GLASS_OS" | "KINETIC_MINIMAL";
};

export type YoutubeVideo = { id: string; title: string; thumbnailUrl: string; publishedAt?: string; viewCount?: number; durationSeconds?: number };
export type YoutubeSettings = {
  source: "SINGLE" | "LATEST" | "FEED";
  layout: "CLASSIC" | "IMAGE" | "PLAYER" | "GRID" | "CAROUSEL" | "CARDS" | "PROFILE";
  interaction: "INLINE" | "YOUTUBE";
  filter: "ALL" | "VIDEOS" | "SHORTS" | "PLAYLIST" | "PICKED";
  sort: "RECENT" | "VIEWS" | "MANUAL";
  askSubscribe: boolean;
  channelId?: string;
  playlistId?: string;
  videos?: YoutubeVideo[];
};

export type SocialLink = { platform: string; url: string; position: number };
export type LockConfig = {
  codeLock?: { enabled: boolean; passcodeHash?: string | null; hasPasscode?: boolean };
  ageLock?: { enabled: boolean; minAge: number };
  subscribeLock?: { enabled: boolean; collectEmail: boolean; collectPhone?: boolean };
  sensitiveWarning?: { enabled: boolean };
};
export type RoutingRule = { condition: string; destinationUrl: string };

export type DashboardProfile = {
  id: string;
  username: string;
  tier: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeConfig: ThemeConfig;
  socialLinks: SocialLink[];
  shopEnabled: boolean;
};

export type DashboardLink = {
  id: string;
  profileId: string;
  type: string;
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  position: number;
  parentId: string | null;
  isArchived: boolean;
  isActive: boolean;
  isPinned: boolean;
  isSpotlight: boolean;
  animation: string | null;
  layoutSize: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  lockConfig: LockConfig;
  contextPayload: Record<string, unknown>;
  clicks: number;
};

export type DashboardData = {
  profile: DashboardProfile;
  links: DashboardLink[];
  stats: {
    views: number;
    clicks: number;
    ctr: number;
    subscribers: number;
    windowOpens: number;
    videoPlays: number;
    watchSeconds: number;
    actionClicks: number;
    whatsappClicks: number;
    bookingOpens: number;
    engagement: { linkId: string; title: string; windowOpens: number; videoPlays: number; watchSeconds: number; actionClicks: number; whatsappClicks: number; bookingOpens: number }[];
    sources: { name: string; views: number }[];
    series: { label: string; views: number; clicks: number }[];
  };
  subscribers: { id: string; email: string | null; fullName: string | null; message: string | null; createdAt: string }[];
};

export type PublicLink = Omit<DashboardLink, "clicks" | "profileId"> & { isLocked: boolean };
export type PublicProfileData = { profile: DashboardProfile; links: PublicLink[] };

export const THEME_PRESETS: ThemeConfig[] = [
  { preset: "Warm cream", background: "#f5eee3", textColor: "#302d29", buttonColor: "#ffffff", buttonTextColor: "#302d29", buttonRadius: "14px", showLogo: true },
  { preset: "Lavender", background: "#e9e2f4", textColor: "#302740", buttonColor: "#ffffff", buttonTextColor: "#302740", buttonRadius: "999px", showLogo: true },
  { preset: "Matcha", background: "#dce8d0", textColor: "#263a29", buttonColor: "#f7fbf1", buttonTextColor: "#263a29", buttonRadius: "14px", showLogo: true },
  { preset: "Midnight", background: "#22252b", textColor: "#ffffff", buttonColor: "#383c43", buttonTextColor: "#ffffff", buttonRadius: "14px", showLogo: true },
  { preset: "Pulse Dark", background: "#101116", textColor: "#f5f7ed", buttonColor: "#252731", buttonTextColor: "#ffffff", buttonRadius: "14px", showLogo: true },
];
