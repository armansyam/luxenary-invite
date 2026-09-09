import { MetadataRoute } from 'next';
import { getAdminSetting } from '@/lib/settings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const appName = await getAdminSetting("platform_name", "Platform Undangan");
  const shortName = appName.split(' ')[0];
  
  return {
    name: appName,
    short_name: shortName,
    description: 'Platform Undangan Pernikahan Digital Elegan',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#1c1917',
    theme_color: '#0c0a09',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: '/assets/brand/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/assets/brand/favicon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/assets/brand/favicon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
