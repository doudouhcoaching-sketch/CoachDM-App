import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.coachdm.be';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/sign-up', '/subscribe'],
        disallow: ['/app', '/coach', '/api', '/auth'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
