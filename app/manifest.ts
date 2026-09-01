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
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
