import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Luxenary Invite',
    short_name: 'Luxenary',
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
