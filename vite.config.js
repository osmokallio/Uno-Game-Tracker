import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  // Replace with your repo name if different
  base: '/Uno-Game-Tracker/',
});
