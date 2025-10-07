import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { RootProvider } from "./rootProvider";
import ServerInitializer from "./components/server-initializer";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NewsCast Debate (Beta) - AI-Powered News Debates on Base",
  description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards on the Base blockchain. Experience the future of social news discussion.",
  keywords: "news debate, AI debates, Base blockchain, cryptocurrency, social media, news discussion, blockchain rewards, decentralized social",
  authors: [{ name: "NewsCast Debate Team" }],
  creator: "NewsCast Debate",
  publisher: "Base",
  robots: "index, follow",
  openGraph: {
    title: "NewsCast Debate (Beta) - AI-Powered News Debates on Base",
    description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards on the Base blockchain.",
    type: "website",
    locale: "en_US",
    siteName: "NewsCast Debate",
  },
  twitter: {
    card: "summary_large_image",
    title: "NewsCast Debate (Beta) - AI-Powered News Debates on Base",
    description: "Join engaging AI-powered debates on trending news topics. Earn points, compete with others, and win rewards on the Base blockchain.",
    creator: "@base",
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://news-debate-onbase-app.vercel.app/og-image.png",
      button: {
        title: "Join Debate",
        action: {
          type: "launch_frame",
          name: "NewsCast Debate",
          url: "https://news-debate-onbase-app.vercel.app",
          splashImageUrl: "https://news-debate-onbase-app.vercel.app/Base_basemark_blue.png",
          splashBackgroundColor: "#ffffff"
        }
      }
    })
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NewsCast Debate" />
      </head>
      <body className={inter.variable}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "NewsCast Debate (Beta)",
              "description": "AI-powered news debates on Base blockchain",
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
              "keywords": "news debate, AI debates, Base blockchain, cryptocurrency, social media"
            })
          }}
        />
        <RootProvider>
          <ServerInitializer />
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
