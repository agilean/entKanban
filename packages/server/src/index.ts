import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { defaultDbPath, openDatabase } from './db.js';
import { resolveWebDistPath } from './static.js';

const port = Number(process.env.PORT ?? '3910');
const dbPath = defaultDbPath();
const db = openDatabase(dbPath);
const webDistPath = resolveWebDistPath();
const app = createApp(db, { serveWeb: Boolean(webDistPath) });

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Kanban server listening on http://localhost:${info.port}`);
    console.log(`SQLite database: ${dbPath}`);
    if (webDistPath) {
      console.log(`Serving web static files from: ${webDistPath}`);
    }
  },
);
