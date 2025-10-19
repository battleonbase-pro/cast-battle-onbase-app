import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { RootProvider } from "./rootProvider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewsCast Debate (Beta) - AI-Powered News Debates",
  description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards. Experience the future of social news discussion.",
  keywords: "news debate, AI debates, blockchain, cryptocurrency, social media, news discussion, blockchain rewards, decentralized social",
  authors: [{ name: "NewsCast Debate Team" }],
  creator: "NewsCast Debate",
  publisher: "Base",
  robots: "index, follow",
  openGraph: {
    title: "NewsCast Debate (Beta) - AI-Powered News Debates",
    description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards.",
    type: "website",
    locale: "en_US",
    siteName: "NewsCast Debate",
    images: [
      {
        url: "https://news-debate-app-733567590021.us-central1.run.app/api/og-image",
        width: 1200,
        height: 630,
        alt: "NewsCast Debate - AI-Powered News Debates",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NewsCast Debate (Beta) - AI-Powered News Debates",
    description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards.",
    creator: "@base",
    images: ["https://news-debate-app-733567590021.us-central1.run.app/api/og-image"],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://news-debate-app-733567590021.us-central1.run.app/api/og-image",
      button: {
        title: "Join AI Debate",
        action: {
          type: "launch_miniapp",
          name: "NewsCast Debate",
          url: "https://news-debate-app-733567590021.us-central1.run.app",
          splashImageUrl: "https://news-debate-app-733567590021.us-central1.run.app/api/og-image",
          splashBackgroundColor: "#0052FF"
        }
      }
    })
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0052FF", // Base blue color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/Base_basemark_blue.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NewsCast Debate" />
        
        {/* Farcaster Mini App Meta Tags */}
        <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://news-debate-app-733567590021.us-central1.run.app/api/og-image","button":{"title":"Join AI Debate","action":{"type":"launch_miniapp","name":"NewsCast Debate","url":"https://news-debate-app-733567590021.us-central1.run.app","splashImageUrl":"https://news-debate-app-733567590021.us-central1.run.app/api/og-image","splashBackgroundColor":"#0052FF"}}}' />
        {/* For backward compatibility */}
        <meta name="fc:frame" content='{"version":"1","imageUrl":"https://news-debate-app-733567590021.us-central1.run.app/api/og-image","button":{"title":"Join AI Debate","action":{"type":"launch_miniapp","name":"NewsCast Debate","url":"https://news-debate-app-733567590021.us-central1.run.app","splashImageUrl":"https://news-debate-app-733567590021.us-central1.run.app/api/og-image","splashBackgroundColor":"#0052FF"}}}' />
      </head>
      <body className={inter.variable}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "NewsCast Debate (Beta)",
              "description": "AI-powered news debates",
              "url": "https://newscast-debate.vercel.app",
              "applicationCategory": "SocialNetworkingApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Base",
                "url": "https://base.org"
              },
              "keywords": "news debate, AI debates, blockchain, cryptocurrency, social media"
            })
          }}
        />
        <RootProvider>
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
