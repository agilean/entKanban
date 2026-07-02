import { Hono } from 'hono';

type LeanGameContact = {
  stage?: string;
  stageName?: string;
  score?: number | string;
  name?: string;
  phone?: string;
  organization?: string;
  completedAt?: string;
  durationSeconds?: number | string;
};

type SupabaseScoreRow = {
  stage: string;
  stage_name: string;
  score: number;
  name: string;
  phone: string;
  organization: string | null;
  completed_at: string;
  duration_seconds: number;
};

const FALLBACK_SUPABASE_URL = 'https://zsfkozzcuulptbzubyws.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_Rqfkd5vGt2i509B-n-dXaQ_pWJLzRaV';

export function createLeanGameScoreRoutes(): Hono {
  const routes = new Hono();

  routes.post('/score-submit', async (c) => {
    const contact = (await c.req.json()) as LeanGameContact;
    const missingField = ['name', 'phone', 'completedAt', 'durationSeconds'].find(
      (field) => contact[field as keyof LeanGameContact] === undefined || contact[field as keyof LeanGameContact] === '',
    );

    if (missingField) {
      return c.json({ error: `Missing field: ${missingField}` }, 400);
    }

    try {
      const response = await fetch(`${getSupabaseUrl()}/rest/v1/${getScoresTable()}`, {
        method: 'POST',
        headers: getSupabaseHeaders('return=minimal'),
        body: JSON.stringify({
          stage: contact.stage || 'Lean Basics',
          stage_name: contact.stageName || '知识闯关：认识精益',
          score: Number(contact.score || 0),
          name: String(contact.name).trim(),
          phone: String(contact.phone).trim(),
          organization: String(contact.organization || '').trim(),
          completed_at: contact.completedAt,
          duration_seconds: Number(contact.durationSeconds),
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        return c.json({ error: 'Supabase insert failed', detail }, 502);
      }

      return c.json({ ok: true });
    } catch {
      return c.json({ error: 'Submit failed' }, 500);
    }
  });

  routes.get('/score-list', async (c) => {
    try {
      const response = await fetch(
        `${getSupabaseUrl()}/rest/v1/${getScoresTable()}?select=stage,stage_name,score,name,phone,organization,completed_at,duration_seconds&order=completed_at.desc`,
        { headers: getSupabaseHeaders() },
      );

      if (!response.ok) {
        const detail = await response.text();
        return c.json({ error: 'Supabase query failed', detail }, 502);
      }

      const rows = (await response.json()) as SupabaseScoreRow[];
      return c.json(
        rows.map((row) => ({
          name: row.name,
          stage: row.stage,
          stageName: row.stage_name,
          score: row.score,
          phone: row.phone,
          organization: row.organization,
          completedAt: row.completed_at,
          durationSeconds: row.duration_seconds,
        })),
      );
    } catch {
      return c.json({ error: 'Load scores failed' }, 500);
    }
  });

  return routes;
}

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
}

function getScoresTable(): string {
  return process.env.SUPABASE_SCORES_TABLE || 'lean_game_scores';
}

function getSupabaseHeaders(prefer?: string): HeadersInit {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}
