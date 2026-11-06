'use strict';
/*
 * Database connection.
 * - If DATABASE_URL (or POSTGRES_URL) is set, connects to that PostgreSQL database
 *   (e.g. Neon through Vercel → Storage). This is required on Vercel.
 * - Otherwise uses PGlite, an embedded PostgreSQL that stores its files in DATA_DIR
 *   (handy on your own computer or a server with a disk).
 */
const path = require('node:path');
const fs = require('node:fs');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  pass     TEXT NOT NULL,
  role     TEXT NOT NULL DEFAULT 'member',
  status   TEXT NOT NULL DEFAULT 'pending',
  created  DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token    TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created  DOUBLE PRECISION NOT NULL,
  expires  DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_by_google ON users(google_sub);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  center     TEXT NOT NULL DEFAULT '',
  doc_order  TEXT NOT NULL DEFAULT '[]',
  created    DOUBLE PRECISION NOT NULL,
  created_by TEXT
);
CREATE TABLE IF NOT EXISTS members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS docs (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL,
  added      DOUBLE PRECISION NOT NULL,
  paras      TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS codes (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  descr      TEXT NOT NULL DEFAULT '',
  theme      TEXT,
  at         DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS themes (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  descr      TEXT NOT NULL DEFAULT '',
  parent     TEXT,
  ord        DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS segs (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  doc_id     TEXT NOT NULL,
  s          INTEGER NOT NULL,
  e          INTEGER NOT NULL,
  c          TEXT NOT NULL DEFAULT '[]',
  m          TEXT NOT NULL DEFAULT '',
  by_user    TEXT,
  at         DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, id)
);
CREATE INDEX IF NOT EXISTS segs_by_doc ON segs(project_id, doc_id);
CREATE TABLE IF NOT EXISTS changes (
  seq        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client     TEXT,
  by_user    TEXT,
  ops        TEXT NOT NULL,
  at         DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS changes_by_project ON changes(project_id, seq);
CREATE TABLE IF NOT EXISTS presence (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client     TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL DEFAULT '{}',
  seen       DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (project_id, client)
);
`;

let ready = null;

class NoDatabaseError extends Error {}

// Find the Postgres connection string, whatever prefix Vercel/Neon gave it
// (DATABASE_URL, POSTGRES_URL, STORAGE_URL, MYDB_DATABASE_URL, NEON_DATABASE_URL, …) or build it from PG* parts.
function findDatabaseUrl() {
  const env = process.env;
  const isPg = v => typeof v === 'string' && /^postgres(ql)?:\/\//i.test(v.trim());
  for (const k of ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'POSTGRES_PRISMA_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING']) if (isPg(env[k])) return env[k].trim();
  const keys = Object.keys(env).filter(k => isPg(env[k]));
  const pick = keys.find(k => /(^|_)DATABASE_URL$/.test(k)) || keys.find(k => /(^|_)POSTGRES_URL$/.test(k)) || keys.find(k => /_URL$/.test(k) && !/UNPOOLED|NON_POOLING/.test(k)) || keys[0];
  if (pick) return env[pick].trim();
  const host = env.PGHOST || env.POSTGRES_HOST, user = env.PGUSER || env.POSTGRES_USER, pass = env.PGPASSWORD || env.POSTGRES_PASSWORD, db = env.PGDATABASE || env.POSTGRES_DATABASE;
  if (host && user && db) return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass || '')}@${host}/${db}?sslmode=require`;
  return null;
}
// Names (never values) of settings that look database-related, to help with setup.
function databaseSettingNames() {
  return Object.keys(process.env).filter(k => /DATABASE|POSTGRES|^PG|NEON/i.test(k) && !/^(PGLITE)/.test(k)).sort();
}

function connect() {
  const url = findDatabaseUrl();
  if (url) {
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: url, max: parseInt(process.env.PG_POOL_MAX, 10) || 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
    pool.on('error', () => { }); // idle client errors (e.g. database scaled to zero) are recovered on next query
    try { require('@vercel/functions').attachDatabasePool(pool); } catch (_) { /* optional */ }
    return {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      async tx(fn) {
        const c = await pool.connect();
        try { await c.query('BEGIN'); const r = await fn({ query: (t, p) => c.query(t, p) }); await c.query('COMMIT'); return r; }
        catch (e) { await c.query('ROLLBACK').catch(() => { }); throw e; }
        finally { c.release(); }
      },
    };
  }
  if (process.env.VERCEL) {
    const seen = databaseSettingNames();
    throw new NoDatabaseError('No database is connected. In Vercel open this project → Storage, connect a Neon Postgres database to THIS project (tick Production), then go to Deployments → ⋯ → Redeploy. '
      + (seen.length ? 'Database-related settings found, but none holds a postgres:// address: ' + seen.join(', ') + '.' : 'No database settings were found in this project\u2019s environment variables.'));
  }
  const { PGlite } = require('@electric-sql/pglite');
  const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'pg');
  fs.mkdirSync(dir, { recursive: true });
  const lite = new PGlite(dir);
  return {
    kind: 'pglite',
    query: (text, params) => lite.query(text, params),
    tx: (fn) => lite.transaction(t => fn({ query: (a, b) => t.query(a, b) })),
    close: () => lite.close(),
  };
}

async function getDb() {
  if (!ready) {
    ready = (async () => {
      const db = connect();
      // run schema statements one by one (works on both drivers)
      for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
        try { await db.query(stmt); }
        catch (e) { if (!['23505', '42P07', '42710'].includes(e.code)) throw e; } // another instance created it at the same moment
      }
      return db;
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

module.exports = { getDb, NoDatabaseError };
