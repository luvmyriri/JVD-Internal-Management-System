import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Triggering reload after installing new dependencies
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000';

  // let wsProxyTarget = 'ws://localhost:6001';
  // try {
  //   const url = new URL(proxyTarget);
  //   wsProxyTarget = `ws://${url.hostname}:6001`;
  // } catch (e) {
  //   // Fallback if parsing fails
  // }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 3000,
      strictPort: false, // Allow falling back to another port if 3000 is busy
      allowedHosts: [
        'cathedrallike-eleanore-dialytic.ngrok-free.dev',
        '.ngrok-free.dev',
        '.ngrok.io',
        'localhost',
        '.localhost'
      ],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/sanctum': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/storage': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
        // '/ws': {
        //   target: wsProxyTarget,
        //   ws: true,
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/ws/, ''),
        // },
      },
    },
    optimizeDeps: {
      include: ['jspdf', 'jspdf-autotable', 'exceljs', 'file-saver'],
    },
  }
})

