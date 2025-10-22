export async function GET() {
  return Response.json({
    version: "1.0.0",
    name: "NewsCast Debate",
    description: "AI-Powered News Debates on Base",
    icon: {
      url: "https://news-debate-app-733567590021.us-central1.run.app/icon.png",
      dimensions: "256x256"
    },
    launchUrl: "https://news-debate-app-733567590021.us-central1.run.app",
    permissions: [
      "camera",
      "microphone",
      "notifications"
    ],
    categories: ["social", "news", "entertainment"],
    developer: {
      name: "NewsCast Debate Team",
      url: "https://news-debate-app-733567590021.us-central1.run.app"
    }
  });
}
