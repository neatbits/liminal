import { defineConfig } from 'vite';

export default defineConfig({
  // Relativ base slik at bygget fungerer fra hvilken som helst mappe/statisk host.
  base: './',
  server: { port: 5180 },
  // three.js alene er ~600 kB minifisert; det er forventet.
  build: {
    chunkSizeWarningLimit: 900,
    // To sider: forsiden (index.html) og simulatoren (app/index.html).
    rollupOptions: { input: { main: 'index.html', app: 'app/index.html' } },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
