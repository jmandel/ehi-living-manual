// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import wasm from 'vite-plugin-wasm';
import { generateSidebar } from './scripts/generate-sidebar.ts';

// Generate sidebar dynamically from markdown files
const sidebar = await generateSidebar();

// https://astro.build/config
export default defineConfig({
  site: 'https://jmandel.github.io',
  base: '/ehi-missing-manual',
  integrations: [
    starlight({
      title: 'Epic EHI Manual',
      description: 'The definitive guide to Epic\'s Electronic Health Information export format',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/jmandel/ehi-missing-manual' },
      ],
      sidebar: [
        {
          label: 'Home',
          link: '/'
        },
        ...sidebar,
        {
          label: 'Resources',
          items: [
            { label: 'SQL Playground', link: '/playground/' },
            { label: 'GitHub Repository', link: 'https://github.com/jmandel/ehi-missing-manual' },
          ]
        }
      ],
      customCss: [
        './src/styles/custom.css',
        './src/styles/sql-widget.css',
        './src/styles/mermaid.css',
        './src/styles/sql-playground.css',
      ],
    }),
    react(),
  ],
  output: 'static',
  vite: {
    plugins: [wasm()],
    optimizeDeps: {
      exclude: ['sql.js'] // Don't pre-bundle sql.js
    },
    assetsInclude: ['**/*.wasm'] // Ensure WASM files are treated as assets
  }
});