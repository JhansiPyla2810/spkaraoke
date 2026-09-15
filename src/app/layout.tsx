import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPKaraoke — Telugu & Hindi Karaoke Tracks, Kakinada",
  description:
    "SPKaraoke is a hand-built karaoke track library with 5,000+ Telugu and 1,000+ Hindi songs, plus karaoke events in Kakinada, India. Browse the catalog or request a song.",
  metadataBase: new URL("https://spkaraoke.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SPKaraoke",
    title: "SPKaraoke — Telugu & Hindi Karaoke Tracks",
    description:
      "5,000+ Telugu and 1,000+ Hindi karaoke tracks, hand-mixed. Browse the catalog, book a karaoke event, or request a song.",
    url: "https://spkaraoke.vercel.app",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "SPKaraoke — Telugu & Hindi Karaoke Tracks",
    description: "5,000+ Telugu and 1,000+ Hindi karaoke tracks, hand-mixed in Kakinada, India.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "SPKaraoke",
  description:
    "Hand-built Telugu and Hindi karaoke track library with 5,000+ Telugu and 1,000+ Hindi songs, plus karaoke events.",
  url: "https://spkaraoke.vercel.app/",
  telephone: "+91-99495-58981",
  email: "sivapyla8981@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kakinada",
    addressRegion: "Andhra Pradesh",
    addressCountry: "IN",
  },
  sameAs: ["https://www.youtube.com/@Spkaraoke8981"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Manrope:wght@400;500;600;700;800&family=Space+Mono:wght@700&family=Noto+Sans+Telugu:wght@400;500;600;700;800&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
