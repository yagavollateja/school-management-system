import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { componentTagger } from "lovable-tagger"

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },

  build: {
    chunkSizeWarningLimit: 1000, // optional (warning control)

    rollupOptions: {
      output: {
        manualChunks: {
          // Core libraries
          react: ["react", "react-dom"],

          // Routing
          router: ["react-router-dom"],

          // Supabase (API layer)
          supabase: ["@supabase/supabase-js"],

          // UI / Icons (adjust based on your usage)
          ui: ["lucide-react"],

          // Optional: if using charts
          charts: ["recharts"],
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
    ],
  },
}))
