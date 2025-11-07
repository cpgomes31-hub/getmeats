import { defineConfig } from 'vite'

// Load ESM-only plugin dynamically to avoid Node require/ESM interop issues
export default defineConfig(async () => {
  const reactPlugin = (await import('@vitejs/plugin-react')).default
  return {
    plugins: [reactPlugin()],
    server: {
      host: '0.0.0.0', // Escuta em todas as interfaces
      port: 5173,
      allowedHosts: ['dry-worlds-carry.loca.lt', 'tangy-aliens-buy.loca.lt', 'angry-ducks-crash.loca.lt', 'three-spiders-marry.loca.lt', 'pink-ghosts-grin.loca.lt'], // Permite hosts do LocalTunnel
      proxy: {
        '/api/mercadopago': {
          target: 'https://api.mercadopago.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/mercadopago/, ''),
          configure: (proxy: any, options: any) => {
            proxy.on('error', (err: any, req: any, res: any) => {
              console.log('proxy error', err);
            });
            // Removido o header Authorization daqui - será enviado do frontend
          },
        }
      }
    }
  }
})
