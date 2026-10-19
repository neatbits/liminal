import { defineConfig } from 'vite';

export default defineConfig({
  // Relativ base slik at bygget fungerer fra hvilken som helst mappe/statisk host.
  base: './',
  server: { port: 5180 },
  // Fysikken (lekeklossene) lastes dynamisk; forhåndsbunt den, så første innlasting i dev ikke feiler.
  optimizeDeps: { include: ['cannon-es'] },
  // three.js alene er ~600 kB minifisert; det er forventet.
  build: {
    chunkSizeWarningLimit: 900,
    // Tre sider: forsiden (index.html), simulatoren (app/) og About & credits (about/).
    rollupOptions: { input: { main: 'index.html', app: 'app/index.html', about: 'about/index.html' } },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
