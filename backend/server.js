import express from 'express';
import path from 'path';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3000;

// Vite / Static file serving
if (process.env.NODE_ENV !== "production") {
  async function setupViteDevServer() {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  setupViteDevServer().catch(console.error);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CRM Express backend server running on http://localhost:${PORT}`);
  });
}

export default app;
