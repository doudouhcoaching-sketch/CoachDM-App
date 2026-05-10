import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.coachdm.be'),
  title: {
    default: 'Coach DM — Nutrition & Coaching de précision',
    template: '%s · Coach DM',
  },
  description:
    'L\'app fitness science-based de Coach DM. Tracking nutrition, scan code-barres, macros calculées sur-mesure. 7 jours d\'essai gratuit.',
  keywords: [
    'coaching en ligne',
    'nutrition fitness',
    'tracking macros',
    'app fitness',
    'Coach DM',
    'Doudouh M',
    'coaching online Belgique',
  ],
  authors: [{ name: 'Doudouh M.', url: 'https://coachdm.be' }],
  creator: 'Coach DM',
  publisher: 'Coach DM',
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    url: 'https://app.coachdm.be',
    siteName: 'Coach DM',
    title: 'Coach DM — Nutrition & Coaching de précision',
    description:
      'L\'app fitness science-based avec tracking nutrition et scan code-barres. 19,99€/mois, 7 jours d\'essai gratuit.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coach DM — Nutrition & Coaching de précision',
    description: 'L\'app fitness science-based. 7 jours gratuits.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
