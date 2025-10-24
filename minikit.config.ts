const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "https://news-debate-app-3lducklitq-uc.a.run.app";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  miniapp: {
    version: "1",
    name: "NewsCast Debate",
    subtitle: "AI-powered news debate platform",
    description: "Join intelligent debates about trending news topics and earn rewards for your insights",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/og-image.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["news", "debate", "ai", "social"],
    heroImageUrl: `${ROOT_URL}/og-image.png`,
    tagline: "Debate the news, earn rewards",
    ogTitle: "NewsCast Debate - AI-powered news debates",
    ogDescription: "Join intelligent debates about trending news topics and earn rewards for your insights",
    ogImageUrl: `${ROOT_URL}/og-image.png`,
  },
} as const;
