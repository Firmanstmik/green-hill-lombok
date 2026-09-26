import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Site-wide social image (public/og-image.jpg). Social networks need an
 * absolute URL, so it becomes absolute once VITE_SITE_URL is configured.
 */
function socialImage(site: string): Plugin {
  const base = /^https:\/\/[^/]+$/.test(site) ? site : "";
  return {
    name: "green-hill-social-image",
    transformIndexHtml(html) {
      const url = `${base}/og-image.jpg`;
      return html.replace(
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta property="og:image" content="${url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${url}" />
    <meta name="twitter:card" content="summary_large_image" />`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    socialImage((loadEnv(mode, process.cwd(), "").VITE_SITE_URL || "").trim().replace(/\/+$/, "")),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached long-term
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // UI primitives
          'vendor-radix': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          // Animation library
          'vendor-framer': ['framer-motion'],
          // Mapping — opportunity memo and the admin editor
          'vendor-mapbox': ['mapbox-gl'],
          // Drag-and-drop — admin photo ordering
          'vendor-dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
          // Supabase + data fetching
          'vendor-data': [
            '@supabase/supabase-js',
            '@tanstack/react-query',
          ],
          // Rich text editor — admin opportunity editor
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
          ],
        },
      },
    },
  },
}));
