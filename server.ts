import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  // Support json, urlencoded, and raw payloads for webhook verification
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount backend API routes
  app.use('/api', apiRouter);

  // Support /webhooks/whatsapp directly in case Meta callback URL is configured without /api
  app.all('/webhooks/whatsapp', (req: Request, res: Response, next: NextFunction) => {
    req.url = '/webhooks/whatsapp';
    apiRouter(req, res, next);
  });

  // In development, hook up Vite dev server middlewares
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err?.message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Instagram AI Auto Reply] Server running at http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch(err => {
  console.error('[Server Fatal]:', err);
  process.exit(1);
});
