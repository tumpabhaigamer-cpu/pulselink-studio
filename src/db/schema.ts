import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { LockConfig, RoutingRule, SocialLink, ThemeConfig } from "@/lib/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash"),
  oauthProvider: text("oauth_provider"),
  mfaSecret: text("mfa_secret"),
  stripeCustomerId: text("stripe_customer_id"),
  razorpayAccountId: text("razorpay_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 40 }).notNull().unique(),
  customDomain: text("custom_domain").unique(),
  tier: text("tier").notNull().default("FREE"),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  shopEnabled: boolean("shop_enabled").notNull().default(false),
  headerVideoUrl: text("header_video_url"),
  themeConfig: jsonb("theme_config").$type<ThemeConfig>().notNull(),
  socialLinks: jsonb("social_links").$type<SocialLink[]>().notNull().default([]),
  seoConfig: jsonb("seo_config").$type<Record<string, unknown>>().notNull().default({}),
  pixelsConfig: jsonb("pixels_config").$type<Record<string, unknown>>().notNull().default({}),
  redirectUrl: text("redirect_url"),
  redirectUntil: timestamp("redirect_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const youtubeConnections = pgTable("youtube_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pulseDemoLeads = pgTable("pulse_demo_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  demoSlug: text("demo_slug").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  interest: text("interest"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instagramAutomations = pgTable("instagram_automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  scope: text("scope").notNull().default("ALL"),
  mediaId: text("media_id"),
  nextMediaId: text("next_media_id"),
  triggerType: text("trigger_type").notNull().default("KEYWORD"),
  keyword: text("keyword").notNull().default("LINK"),
  message: text("message").notNull().default("Thanks for reaching out! Here’s the link: {link}"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instagramDeliveries = pgTable("instagram_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  automationId: uuid("automation_id").notNull().references(() => instagramAutomations.id, { onDelete: "cascade" }),
  commentId: text("comment_id").notNull().unique(),
  status: text("status").notNull().default("PROCESSING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("EDITOR"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (table) => [uniqueIndex("team_profile_user_idx").on(table.profileId, table.userId)]);

export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("CLASSIC_LINK"),
  title: text("title").notNull(),
  url: text("url"),
  thumbnailUrl: text("thumbnail_url"),
  position: integer("position").notNull().default(0),
  parentId: uuid("parent_id").references((): AnyPgColumn => links.id, { onDelete: "set null" }),
  isArchived: boolean("is_archived").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isPinned: boolean("is_pinned").notNull().default(false),
  isSpotlight: boolean("is_spotlight").notNull().default(false),
  animation: text("animation"),
  layoutSize: text("layout_size").notNull().default("STANDARD"),
  scheduleStart: timestamp("schedule_start", { withTimezone: true }),
  scheduleEnd: timestamp("schedule_end", { withTimezone: true }),
  lockConfig: jsonb("lock_config").$type<LockConfig>().notNull().default({}),
  routingRules: jsonb("routing_rules").$type<RoutingRule[]>().notNull().default([]),
  contextPayload: jsonb("context_payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("links_profile_position_idx").on(table.profileId, table.position)]);

export const productsAndServices = pgTable("products_and_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  linkId: uuid("link_id").references(() => links.id, { onDelete: "set null" }),
  productType: text("product_type").notNull(),
  title: text("title").notNull(),
  priceMinor: integer("price_minor").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  discountCodes: jsonb("discount_codes").$type<Record<string, unknown>[]>().notNull().default([]),
  fileStorageKey: text("file_storage_key"),
  calendarAvailability: jsonb("calendar_availability").$type<Record<string, unknown>>().notNull().default({}),
  platformFeeBps: integer("platform_fee_bps").notNull().default(1200),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersAndBookings = pgTable("orders_and_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => productsAndServices.id, { onDelete: "set null" }),
  buyerName: text("buyer_name"),
  buyerEmail: text("buyer_email"),
  buyerPhone: text("buyer_phone"),
  amountTotal: integer("amount_total").notNull().default(0),
  platformFeeAmount: integer("platform_fee_amount").notNull().default(0),
  creatorPayoutAmount: integer("creator_payout_amount").notNull().default(0),
  paymentGateway: text("payment_gateway"),
  paymentStatus: text("payment_status").notNull().default("PENDING"),
  bookedSlotUtc: timestamp("booked_slot_utc", { withTimezone: true }),
  meetingUrl: text("meeting_url"),
  downloadToken: text("download_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const crmSubscribers = pgTable("crm_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sourceLinkId: uuid("source_link_id").references(() => links.id, { onDelete: "set null" }),
  email: text("email"),
  phoneWhatsapp: text("phone_whatsapp"),
  fullName: text("full_name"),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>().notNull().default({}),
  ipCountry: text("ip_country"),
  syncedToIntegrations: boolean("synced_to_integrations").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("subscribers_profile_idx").on(table.profileId)]);

export const analyticsEvents = pgTable("analytics_events", {
  eventId: uuid("event_id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  linkId: uuid("link_id").references(() => links.id, { onDelete: "set null" }),
  visitorHash: text("visitor_hash"),
  referrerDomain: text("referrer_domain"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  deviceOs: text("device_os"),
  countryCode: text("country_code"),
  city: text("city"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("analytics_profile_created_idx").on(table.profileId, table.createdAt)]);
