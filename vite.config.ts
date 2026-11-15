import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
  const ogImage = siteUrl ? `${siteUrl}/branding/og-image.jpg` : '/branding/og-image.jpg'

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-og-meta',
        transformIndexHtml(html) {
          let out = html.replaceAll('%OG_IMAGE%', ogImage)
          if (siteUrl) {
            out = out.replace(
              '</head>',
              `    <meta property="og:url" content="${siteUrl}" />\n  </head>`,
            )
          }
          return out
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})