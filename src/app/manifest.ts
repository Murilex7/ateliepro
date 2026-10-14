import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AteliêPro - Gestão de Ateliês',
    short_name: 'AteliêPro',
    description: 'Gestão inteligente e precificação para ateliês de costura',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#E11D48',
    icons: [
      { src: '/logo.jpg', sizes: '192x192', type: 'image/jpeg' },
      { src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
  }
}
