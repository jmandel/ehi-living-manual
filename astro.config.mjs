// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import wasm from 'vite-plugin-wasm';
import { generateSidebar } from './scripts/generate-sidebar.ts';

// Generate sidebar dynamically from markdown files
const { sidebar, resourceItems } = await generateSidebar();

// https://astro.build/config
export default defineConfig({
  site: 'https://jmandel.github.io',
  base: '/ehi-living-manual',
  integrations: [
    starlight({
      title: 'EHI Living Manual',
      description: 'A living guide to working with Epic\'s Electronic Health Information export format',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/jmandel/ehi-living-manual' },
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
            ...resourceItems,
            { label: 'EHI Playground', link: '/playground/' },
            { label: 'GitHub Repository', link: 'https://github.com/jmandel/ehi-living-manual' },
          ]
        }
      ],
      customCss: [
        './src/styles/custom.css',
        './src/styles/sql-widget.css',
        './src/styles/mermaid.css',
        './src/styles/sql-playground.css',
      ],
      components: {
        SocialIcons: './src/components/overrides/SocialIcons.astro',
        Header: './src/components/overrides/Header.astro',
      },
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
