import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { defaultDbPath, openDatabase } from './db.js';

const port = Number(process.env.PORT ?? '3910');
const dbPath = defaultDbPath();
const db = openDatabase(dbPath);
const app = createApp(db);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Kanban replay server listening on http://localhost:${info.port}`);
    console.log(`SQLite database: ${dbPath}`);
  },
);
