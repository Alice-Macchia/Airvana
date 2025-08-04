import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configurazione per il build di produzione
  build: {
    // Output directory
    outDir: 'dist',
    
    // Ottimizzazioni per il deployment
    rollupOptions: {
      output: {
        // Chunk naming per cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Minificazione
    minify: 'terser',
    
    // Source maps per debugging (opzionale)
    sourcemap: false,
    
    // Target per browser moderni
    target: 'es2015'
  },
  
  // Configurazione per il development server
  server: {
    port: 5173,
    host: true,
    open: true
  },
  
  // Configurazione per il preview
  preview: {
    port: 4173,
    host: true
  }
})
