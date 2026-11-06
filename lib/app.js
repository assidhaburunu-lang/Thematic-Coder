'use strict';
/*
 * Thematic Coder — API.
 * One request handler used both by Vercel (api/index.js) and by the standalone server (server.js).
 * Live collaboration works by short polling (/api/sync), which runs anywhere, including serverless hosts.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { getDb, NoDatabaseError } = require('./db');

const scrypt = promisify(crypto.scrypt);
const ON_VERCEL = !!process.env.VERCEL;
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || ON_VERCEL;
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const SESSION_DAYS = parseInt(process.env.SESSION_DAYS, 10) || 30;
const PEER_TTL = 12_000; // a person counts as "here" if they synced in the last 12 s

/* ------------------------------------------------------------------ helpers */
const now = () => Date.now();
const newId = (prefix) => prefix + crypto.randomBytes(9).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };

function sendJson(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i < 0) return;
    const k = p.slice(0, i).trim(); const v = p.slice(i + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch (_) { out[k] = v; }
  });
  return out;
}
function isHttps(req) {
  if (COOKIE_SECURE) return true;
  if (TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') return true;
  return !!(req.socket && req.socket.encrypted);
}
function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '?';
}
function sessionCookie(req, token, maxAgeSec) {
  return `tc_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${isHttps(req) ? '; Secure' : ''}`;
}
async function readJson(req, limit) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/json')) fail(415, 'Expected JSON');
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body; // some hosts pre-parse
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request is too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (_) { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  let host; try { host = new URL(origin).host; } catch (_) { fail(403, 'Bad origin'); }
  const expected = [req.headers.host, TRUST_PROXY ? req.headers['x-forwarded-host'] : null].filter(Boolean);
  if (!expected.includes(host)) fail(403, 'Cross-site request refused');
}

/* ------------------------------------------------------------------ passwords */
const SCRYPT = { N: 16384, r: 8, p: 1 };
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 64, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), h.toString('base64')].join('$');
}
async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
  const [, N, r, p, salt, hash] = parts;
  const ref = Buffer.from(hash, 'base64');
  const h = await scrypt(pw, Buffer.from(salt, 'base64'), ref.length, { N: +N, r: +r, p: +p });
  return h.length === ref.length && crypto.timingSafeEqual(h, ref);
}
const DUMMY_HASH = 'scrypt$16384$8$1$c2FsdHNhbHRzYWx0c2FsdA==$' + Buffer.alloc(64).toString('base64');

/* ------------------------------------------------------------------ validation */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const NAME_RE = /^[\p{L}\p{M}\p{N} ._'-]+$/u;
function str(v, max, field, allowEmpty = true) {
  if (v == null) v = '';
  if (typeof v !== 'string') fail(400, `${field} must be text`);
  if (v.length > max) fail(400, `${field} is too long`);
  if (!allowEmpty && !v.trim()) fail(400, `${field} is required`);
  return v;
}
const id = (v, field = 'id') => { if (typeof v !== 'string' || !ID_RE.test(v)) fail(400, `Invalid ${field}`); return v; };
const optId = (v, field) => (v == null || v === '') ? null : id(v, field);
const num = (v, field) => { if (v == null) return 0; if (typeof v !== 'number' || !Number.isFinite(v)) fail(400, `${field} must be a number`); return v; };
const color = (v) => (typeof v === 'string' && COLOR_RE.test(v)) ? v.toLowerCase() : '#6b7079';
function paras(v) {
  if (!Array.isArray(v)) fail(400, 'Document text must be a list of paragraphs');
  if (v.length > 200000) fail(400, 'Document has too many paragraphs');
  let total = 0;
  return v.map(p => { if (typeof p !== 'string') fail(400, 'Paragraphs must be text'); total += p.length; if (total > 8_000_000) fail(413, 'Document is too large'); return p.replace(/\u0000/g, ''); });
}
function validName(name) {
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 40) fail(400, 'Name must be 2–40 characters');
  if (!NAME_RE.test(name)) fail(400, 'Name can use letters, numbers, spaces, dots, dashes and underscores');
  return name;
}
const nameKey = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
function validPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) fail(400, 'Password must be at least 8 characters');
  if (pw.length > 200) fail(400, 'Password is too long');
  return pw;
}
const clean = (s) => String(s).replace(/\u0000/g, '');

/* ------------------------------------------------------------------ database helpers */
let DB = null;
const q = async (text, params) => (await DB.query(text, params)).rows;
const one = async (text, params) => (await q(text, params))[0] || null;

async function rateLimit(key, max, windowMs) {
  const t = now();
  const row = await one(
    `INSERT INTO attempts (key, count, reset) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET count = CASE WHEN attempts.reset < $3 THEN 1 ELSE attempts.count + 1 END,
                                     reset = CASE WHEN attempts.reset < $3 THEN $2 ELSE attempts.reset END
     RETURNING count`, [key, t + windowMs, t]);
  if (row && row.count > max) fail(429, 'Too many attempts. Please wait a few minutes and try again.');
}
async function housekeeping() {
  // cheap clean-up, run occasionally from normal requests (no background jobs on serverless)
  if (Math.random() > 0.02) return;
  const t = now();
  await q('DELETE FROM sessions WHERE expires < $1', [t]).catch(() => { });
  await q('DELETE FROM attempts WHERE reset < $1', [t]).catch(() => { });
  await q('DELETE FROM presence WHERE seen < $1', [t - 60_000]).catch(() => { });
  await q('DELETE FROM changes WHERE at < $1', [t - 3 * 86400_000]).catch(() => { });
}
async function getSetting(key, dflt) { const r = await one('SELECT value FROM settings WHERE key = $1', [key]); return r ? r.value : dflt; }
async function signupsOpen() { return (await getSetting('signupsOpen', '1')) === '1'; }
const userCount = async () => (await one('SELECT COUNT(*)::int AS n FROM users')).n;
const ownerCount = async () => (await one("SELECT COUNT(*)::int AS n FROM users WHERE role = 'owner' AND status = 'active'")).n;

async function currentUser(req) {
  const tok = parseCookies(req).tc_session;
  if (!tok || tok.length > 200) return null;
  const u = await one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires > $2', [sha256(tok), now()]);
  return u && u.status === 'active' ? u : null;
}
async function requireUser(req) { const u = await currentUser(req); if (!u) fail(401, 'Please log in'); return u; }
async function requireOwner(req) { const u = await requireUser(req); if (u.role !== 'owner') fail(403, 'Only the owner can do that'); return u; }
async function startSession(req, res, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  await q('INSERT INTO sessions (token, user_id, created, expires) VALUES ($1, $2, $3, $4)', [sha256(token), user.id, now(), now() + SESSION_DAYS * 86400_000]);
  res.setHeader('Set-Cookie', sessionCookie(req, token, SESSION_DAYS * 86400));
}
const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role, status: u.status, created: u.created, email: u.email || null, google: !!u.google_sub, hasPassword: !!u.pass });

async function projectRole(user, pid) {
  if (!user) return null;
  const p = await one('SELECT id FROM projects WHERE id = $1', [pid]); if (!p) return null;
  if (user.role === 'owner') return 'owner';
  const m = await one('SELECT role FROM members WHERE project_id = $1 AND user_id = $2', [pid, user.id]);
  return m ? m.role : null;
}
const canEdit = (role) => role === 'owner' || role === 'manager' || role === 'editor';
const canManage = (role) => role === 'owner' || role === 'manager';   // add/remove collaborators, delete project
const canCreate = (user) => user.role === 'owner' || user.role === 'user'; // account types allowed to start projects
async function requireManager(req, pid) {
  const user = await requireUser(req); id(pid, 'project');
  const role = await projectRole(user, pid);
  if (!role) fail(404, 'Project not found, or you don\u2019t have access to it');
  if (!canManage(role)) fail(403, 'Only the project\u2019s creator or the site owner can do that');
  return { user, role };
}
async function requireProject(req, pid, needEdit) {
  const user = await requireUser(req);
  id(pid, 'project');
  const role = await projectRole(user, pid);
  if (!role) fail(404, 'Project not found, or you don’t have access to it');
  if (needEdit && !canEdit(role)) fail(403, 'You can view this project but not change it');
  return { user, role };
}

/* ------------------------------------------------------------------ project data */
async function loadProject(pid) {
  const p = await one('SELECT * FROM projects WHERE id = $1', [pid]);
  const [codes, themes, docs, segs, last] = await Promise.all([
    q('SELECT id, name, color, descr AS "desc", theme, at FROM codes WHERE project_id = $1', [pid]),
    q('SELECT id, name, color, descr AS "desc", parent, ord AS "order" FROM themes WHERE project_id = $1', [pid]),
    q('SELECT id, name, added, length(paras) AS size FROM docs WHERE project_id = $1', [pid]),
    q('SELECT id, doc_id AS doc, s, e, c, m, by_user AS "by", at FROM segs WHERE project_id = $1', [pid]),
    one('SELECT COALESCE(MAX(seq), 0)::int AS seq FROM changes WHERE project_id = $1', [pid]),
  ]);
  return {
    id: p.id, name: p.name, center: p.center, docOrder: JSON.parse(p.doc_order || '[]'), created: p.created, createdBy: p.created_by,
    codes, themes, docs: docs.map(d => ({ id: d.id, name: d.name, added: d.added })),
    segs: segs.map(r => ({ ...r, c: JSON.parse(r.c) })), seq: last.seq,
  };
}

// Apply one change from a client. Returns the normalised op shared with everyone else.
async function applyOp(t, pid, user, op) {
  if (!op || typeof op !== 'object') fail(400, 'Invalid change');
  const k = op.k; const d = op.data;
  if (k === 'm') {
    if (!d) fail(400, 'Project details can’t be removed');
    const name = clean(str(d.name, 200, 'Project name', false)), center = clean(str(d.center, 500, 'Centre label'));
    const order = Array.isArray(d.docOrder) ? d.docOrder.slice(0, 5000).map(x => id(x, 'document')) : [];
    await t.query('UPDATE projects SET name = $1, center = $2, doc_order = $3 WHERE id = $4', [name, center, JSON.stringify(order), pid]);
    return { k, id: null, data: { name, center, docOrder: order } };
  }
  const oid = id(op.id);
  if (k === 'c') {
    if (d === null) { await t.query('DELETE FROM codes WHERE project_id = $1 AND id = $2', [pid, oid]); return { k, id: oid, data: null }; }
    const v = { name: clean(str(d.name, 200, 'Code name', false)), color: color(d.color), desc: clean(str(d.desc, 5000, 'Description')), theme: optId(d.theme, 'theme'), at: num(d.at, 'at') };
    await t.query(`INSERT INTO codes (project_id, id, name, color, descr, theme, at) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (project_id, id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, descr = EXCLUDED.descr, theme = EXCLUDED.theme, at = EXCLUDED.at`,
      [pid, oid, v.name, v.color, v.desc, v.theme, v.at]);
    return { k, id: oid, data: v };
  }
  if (k === 't') {
    if (d === null) { await t.query('DELETE FROM themes WHERE project_id = $1 AND id = $2', [pid, oid]); return { k, id: oid, data: null }; }
    const v = { name: clean(str(d.name, 200, 'Theme name', false)), color: color(d.color), desc: clean(str(d.desc, 5000, 'Description')), parent: optId(d.parent, 'parent theme'), order: num(d.order, 'order') };
    await t.query(`INSERT INTO themes (project_id, id, name, color, descr, parent, ord) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (project_id, id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, descr = EXCLUDED.descr, parent = EXCLUDED.parent, ord = EXCLUDED.ord`,
      [pid, oid, v.name, v.color, v.desc, v.parent, v.order]);
    return { k, id: oid, data: v };
  }
  if (k === 'd') {
    if (d === null) {
      await t.query('DELETE FROM segs WHERE project_id = $1 AND doc_id = $2', [pid, oid]);
      await t.query('DELETE FROM docs WHERE project_id = $1 AND id = $2', [pid, oid]);
      return { k, id: oid, data: null };
    }
    const v = { name: clean(str(d.name, 300, 'Document name', false)), added: num(d.added, 'added') };
    if (d.paras !== undefined) {
      const p = paras(d.paras);
      await t.query(`INSERT INTO docs (project_id, id, name, added, paras) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, id) DO UPDATE SET name = EXCLUDED.name, added = EXCLUDED.added, paras = EXCLUDED.paras`, [pid, oid, v.name, v.added, JSON.stringify(p)]);
      return { k, id: oid, data: { ...v, hasText: true } }; // collaborators fetch the text separately
    }
    await t.query(`INSERT INTO docs (project_id, id, name, added, paras) VALUES ($1, $2, $3, $4, '[]')
      ON CONFLICT (project_id, id) DO UPDATE SET name = EXCLUDED.name, added = EXCLUDED.added`, [pid, oid, v.name, v.added]);
    return { k, id: oid, data: v };
  }
  if (k === 's') {
    if (d === null) { await t.query('DELETE FROM segs WHERE project_id = $1 AND id = $2', [pid, oid]); return { k, id: oid, data: null }; }
    const doc = id(d.doc, 'document');
    const exists = (await t.query('SELECT 1 FROM docs WHERE project_id = $1 AND id = $2', [pid, doc])).rows.length;
    if (!exists) fail(409, 'That document no longer exists');
    const s = num(d.s, 's'), e = num(d.e, 'e');
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e <= s) fail(400, 'Invalid segment range');
    if (!Array.isArray(d.c) || d.c.length > 100) fail(400, 'Invalid codes on segment');
    const c = [...new Set(d.c.map(x => id(x, 'code')))];
    const m = clean(str(d.m, 20000, 'Memo'));
    const prev = (await t.query('SELECT by_user, at FROM segs WHERE project_id = $1 AND id = $2', [pid, oid])).rows[0];
    const by = prev ? prev.by_user : (typeof d.by === 'string' && d.by === user.id ? d.by : (op.keepBy && typeof d.by === 'string' && ID_RE.test(d.by) ? d.by : user.id));
    const at = prev ? prev.at : (typeof d.at === 'number' ? d.at : now());
    await t.query(`INSERT INTO segs (project_id, id, doc_id, s, e, c, m, by_user, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (project_id, id) DO UPDATE SET doc_id = EXCLUDED.doc_id, s = EXCLUDED.s, e = EXCLUDED.e, c = EXCLUDED.c, m = EXCLUDED.m`,
      [pid, oid, doc, s, e, JSON.stringify(c), m, by, at]);
    return { k, id: oid, data: { doc, s, e, c, m, by, at } };
  }
  fail(400, 'Unknown change type');
}

/* ------------------------------------------------------------------ routes */
const routes = [];
const route = (method, pattern, handler) => {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
};

route('GET', '/api/health', async () => ({ ok: true, db: DB.kind }));
route('GET', '/api/auth/status', async () => ({ hasUsers: (await userCount()) > 0, signupsOpen: await signupsOpen(), google: GOOGLE.enabled() }));

/* ---- Sign in with Google (OpenID Connect, authorization-code flow with PKCE) ---- */
const GOOGLE = {
  id: () => process.env.GOOGLE_CLIENT_ID || '',
  secret: () => process.env.GOOGLE_CLIENT_SECRET || '',
  enabled: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token', // overridable only for automated tests
  domains: () => String(process.env.GOOGLE_ALLOWED_DOMAINS || '').split(',').map(d => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean),
};
function siteOrigin(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const host = (TRUST_PROXY && req.headers['x-forwarded-host']) || req.headers.host;
  return (isHttps(req) ? 'https://' : 'http://') + host;
}
function redirect(res, to, cookies) {
  const h = { Location: to, 'Cache-Control': 'no-store', ...SECURITY_HEADERS };
  if (cookies) h['Set-Cookie'] = cookies;
  res.writeHead(302, h); res.end();
}
const loginMsg = (code) => '/login?msg=' + encodeURIComponent(code);
const oauthCookie = (req, value, maxAge) => `tc_oauth=${value}; HttpOnly; Path=/api/auth/google; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
function cleanGoogleName(raw, email) {
  let n = String(raw || '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._'-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 36).trim();
  if (n.length < 2) n = String(email || 'User').split('@')[0].replace(/[^\p{L}\p{N}._-]+/gu, '').slice(0, 36);
  return n.length >= 2 ? n : 'Google user';
}
async function uniqueName(base) {
  for (let i = 1; i < 100; i++) {
    const n = i === 1 ? base : `${base} ${i}`;
    if (!(await one('SELECT 1 FROM users WHERE name_key = $1', [nameKey(n)]))) return n;
  }
  return base + ' ' + crypto.randomBytes(2).toString('hex');
}

route('GET', '/api/auth/google', async (req, res) => {
  if (!GOOGLE.enabled()) return redirect(res, loginMsg('google-off'));
  const url = new URL(req.url, 'http://x');
  const mode = url.searchParams.get('link') === '1' ? 'link' : 'login';
  if (mode === 'link' && !(await currentUser(req))) return redirect(res, loginMsg('login-first'));
  const state = crypto.randomBytes(18).toString('base64url');
  const nonce = crypto.randomBytes(18).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({
    client_id: GOOGLE.id(), redirect_uri: siteOrigin(req) + '/api/auth/google/callback', response_type: 'code',
    scope: 'openid email profile', state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
  });
  return redirect(res, GOOGLE.authUrl + '?' + params, oauthCookie(req, [state, nonce, verifier, mode].join('.'), 600));
});

route('GET', '/api/auth/google/callback', async (req, res) => {
  const clearCookie = oauthCookie(req, '', 0);
  if (!GOOGLE.enabled()) return redirect(res, loginMsg('google-off'), clearCookie);
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('error')) return redirect(res, loginMsg('google-cancelled'), clearCookie);
  const [state, nonce, verifier, mode] = String(parseCookies(req).tc_oauth || '').split('.');
  const got = url.searchParams.get('state') || '';
  if (!state || got.length !== state.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(state))) return redirect(res, loginMsg('google-expired'), clearCookie);
  await rateLimit('google-ip:' + clientIp(req), 60, 600_000);
  // Exchange the code directly with Google over TLS (so the ID token comes straight from Google).
  let token;
  try {
    const r = await fetch(GOOGLE.tokenUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: GOOGLE.id(), client_secret: GOOGLE.secret(), redirect_uri: siteOrigin(req) + '/api/auth/google/callback', grant_type: 'authorization_code', code_verifier: verifier || '' }),
    });
    token = await r.json();
    if (!r.ok || !token.id_token) throw new Error(token.error_description || token.error || 'no id_token');
  } catch (e) { console.error('Google sign-in failed:', e.message); return redirect(res, loginMsg('google-failed'), clearCookie); }
  let claims;
  try { claims = JSON.parse(Buffer.from(String(token.id_token).split('.')[1], 'base64url').toString('utf8')); } catch (_) { return redirect(res, loginMsg('google-failed'), clearCookie); }
  const okIss = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  const okAud = claims.aud === GOOGLE.id() || (Array.isArray(claims.aud) && claims.aud.includes(GOOGLE.id()));
  if (!okIss || !okAud || claims.nonce !== nonce || !claims.sub || (claims.exp && claims.exp * 1000 < now() - 60_000)) return redirect(res, loginMsg('google-failed'), clearCookie);
  if (!claims.email || claims.email_verified === false || claims.email_verified === 'false') return redirect(res, loginMsg('google-unverified'), clearCookie);
  const email = String(claims.email).toLowerCase();
  const domains = GOOGLE.domains();
  if (domains.length && !domains.includes(email.split('@')[1])) return redirect(res, loginMsg('google-domain'), clearCookie);
  const sub = String(claims.sub);

  // Connect Google to the account that is already logged in
  if (mode === 'link') {
    const me = await currentUser(req);
    if (!me) return redirect(res, loginMsg('login-first'), clearCookie);
    const other = await one('SELECT id FROM users WHERE google_sub = $1', [sub]);
    if (other && other.id !== me.id) return redirect(res, '/?msg=google-in-use', clearCookie);
    await q('UPDATE users SET google_sub = $1, email = $2 WHERE id = $3', [sub, email, me.id]);
    return redirect(res, '/?msg=google-linked', clearCookie);
  }

  let user = await one('SELECT * FROM users WHERE google_sub = $1', [sub]);
  if (!user) {
    const first = (await userCount()) === 0;
    if (!first && !(await signupsOpen())) return redirect(res, loginMsg('closed'), clearCookie);
    const name = await uniqueName(cleanGoogleName(claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' '), email));
    user = { id: newId('u'), name, role: first ? 'owner' : 'member', status: first ? 'active' : 'pending' };
    try { await q('INSERT INTO users (id, name, name_key, pass, role, status, created, email, google_sub) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [user.id, name, nameKey(name), '', user.role, user.status, now(), email, sub]); }
    catch (_) { user = await one('SELECT * FROM users WHERE google_sub = $1', [sub]); if (!user) return redirect(res, loginMsg('google-failed'), clearCookie); }
    if (first) {
      const owners = await q("SELECT id FROM users WHERE role = 'owner' ORDER BY created, id");
      if (owners.length > 1 && owners[0].id !== user.id) { await q("UPDATE users SET role = 'member', status = 'pending' WHERE id = $1", [user.id]); user.status = 'pending'; }
    }
  } else if (user.email !== email) await q('UPDATE users SET email = $1 WHERE id = $2', [email, user.id]);
  if (user.status === 'pending') return redirect(res, loginMsg('pending'), clearCookie);
  if (user.status !== 'active') return redirect(res, loginMsg('disabled'), clearCookie);
  await startSession(req, res, user);
  const sessionHeader = res.getHeader('Set-Cookie');
  return redirect(res, '/', [sessionHeader, clearCookie]);
});

route('POST', '/api/auth/signup', async (req, res) => {
  await rateLimit('signup:' + clientIp(req), 10, 3600_000);
  const body = await readJson(req, 10_000);
  const name = validName(body.name), pw = validPassword(body.password);
  const first = (await userCount()) === 0;
  if (!first && !(await signupsOpen())) fail(403, 'Sign-ups are closed. Ask the owner to open them.');
  if (await one('SELECT 1 FROM users WHERE name_key = $1', [nameKey(name)])) fail(409, 'That name is already taken — choose another.');
  const hash = await hashPassword(pw);
  const user = { id: newId('u'), name, role: first ? 'owner' : 'member', status: first ? 'active' : 'pending' };
  try { await q('INSERT INTO users (id, name, name_key, pass, role, status, created) VALUES ($1, $2, $3, $4, $5, $6, $7)', [user.id, name, nameKey(name), hash, user.role, user.status, now()]); }
  catch (_) { fail(409, 'That name is already taken — choose another.'); }
  if (first) {
    // guard against two people creating the first account at the same moment
    const owners = await q("SELECT id FROM users WHERE role = 'owner' ORDER BY created, id");
    if (owners.length > 1 && owners[0].id !== user.id) { await q("UPDATE users SET role = 'member', status = 'pending' WHERE id = $1", [user.id]); return { ok: true, status: 'pending' }; }
    await startSession(req, res, user); return { ok: true, status: 'active', owner: true };
  }
  return { ok: true, status: 'pending' };
});

route('POST', '/api/auth/login', async (req, res) => {
  await rateLimit('login-ip:' + clientIp(req), 30, 600_000);
  const body = await readJson(req, 10_000);
  const key = nameKey(body.name);
  await rateLimit('login-name:' + key.slice(0, 60), 10, 600_000);
  const pw = typeof body.password === 'string' ? body.password : '';
  const user = key ? await one('SELECT * FROM users WHERE name_key = $1', [key]) : null;
  const ok = await verifyPassword(pw, user ? user.pass : DUMMY_HASH);
  if (!user || !ok) fail(401, 'Name or password is incorrect');
  if (user.status === 'pending') fail(403, 'Your account is waiting for the owner’s approval.');
  if (user.status !== 'active') fail(403, 'This account has been disabled. Contact the owner.');
  await startSession(req, res, user);
  return { ok: true };
});

route('POST', '/api/auth/logout', async (req, res) => {
  const tok = parseCookies(req).tc_session;
  if (tok) await q('DELETE FROM sessions WHERE token = $1', [sha256(tok)]);
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
  return { ok: true };
});

route('GET', '/api/me', async (req) => publicUser(await requireUser(req)));
route('POST', '/api/me/password', async (req) => {
  const user = await requireUser(req);
  await rateLimit('pw:' + user.id, 10, 600_000);
  const body = await readJson(req, 10_000);
  if (user.pass && !(await verifyPassword(String(body.current || ''), user.pass))) fail(400, 'Your current password is incorrect'); // Google-only accounts may set a first password
  await q('UPDATE users SET pass = $1 WHERE id = $2', [await hashPassword(validPassword(body.password)), user.id]);
  await q('DELETE FROM sessions WHERE user_id = $1 AND token <> $2', [user.id, sha256(parseCookies(req).tc_session || '')]);
  return { ok: true };
});
route('GET', '/api/people', async (req) => { await requireUser(req); return q("SELECT id, name, role FROM users WHERE status = 'active' ORDER BY name"); });

// --- projects
const LIST_ALL = `SELECT p.id, p.name, p.created, p.created_by, (SELECT COUNT(*)::int FROM docs d WHERE d.project_id = p.id) AS "nDocs" FROM projects p ORDER BY p.created DESC`;
route('GET', '/api/projects', async (req) => {
  const user = await requireUser(req);
  if (user.role === 'owner') return (await q(LIST_ALL)).map(r => ({ ...r, role: 'owner' }));
  return q(`SELECT p.id, p.name, p.created, p.created_by, m.role, (SELECT COUNT(*)::int FROM docs d WHERE d.project_id = p.id) AS "nDocs"
    FROM projects p JOIN members m ON m.project_id = p.id WHERE m.user_id = $1 ORDER BY p.created DESC`, [user.id]);
});
route('POST', '/api/projects', async (req) => {
  // Creates the project with its themes and codes. Documents are then added in further requests (keeps each request small).
  const user = await requireUser(req);
  if (!canCreate(user)) fail(403, 'Your account can\u2019t create projects. Ask the owner to make you a User.');
  const body = await readJson(req, 4_000_000);
  const pid = newId('p');
  const name = clean(str(body.name, 200, 'Project name', false)), center = clean(str(body.center, 500, 'Centre label'));
  await DB.tx(async t => {
    await t.query('INSERT INTO projects (id, name, center, doc_order, created, created_by) VALUES ($1, $2, $3, $4, $5, $6)', [pid, name, center, '[]', now(), user.id]);
    if (user.role !== 'owner') await t.query("INSERT INTO members (project_id, user_id, role) VALUES ($1, $2, 'manager')", [pid, user.id]); // the creator manages it
    for (const th of (Array.isArray(body.themes) ? body.themes : []).slice(0, 2000)) await applyOp(t, pid, user, { k: 't', id: th.id, data: th });
    for (const c of (Array.isArray(body.codes) ? body.codes : []).slice(0, 10000)) await applyOp(t, pid, user, { k: 'c', id: c.id, data: c });
  });
  return { id: pid };
});
route('GET', '/api/projects/:pid', async (req, res, { pid }) => {
  const { role } = await requireProject(req, pid, false);
  return { ...(await loadProject(pid)), role };
});
route('GET', '/api/projects/:pid/docs/:did', async (req, res, { pid, did }) => {
  await requireProject(req, pid, false);
  const r = await one('SELECT id, name, added, paras FROM docs WHERE project_id = $1 AND id = $2', [pid, id(did, 'document')]);
  if (!r) fail(404, 'Document not found');
  return { id: r.id, name: r.name, added: r.added, paras: JSON.parse(r.paras) };
});
route('POST', '/api/projects/:pid/ops', async (req, res, { pid }) => {
  const { user, role } = await requireProject(req, pid, true);
  const body = await readJson(req, 4_400_000);
  if (!Array.isArray(body.ops) || body.ops.length > 20000) fail(400, 'Invalid list of changes');
  const client = typeof body.client === 'string' ? body.client.slice(0, 64) : null;
  const keepBy = body.import === true && canManage(role); // imports may keep the original coder
  const { out, seq } = await DB.tx(async t => {
    const out = [];
    for (const op of body.ops) out.push(await applyOp(t, pid, user, { ...op, keepBy }));
    const r = (await t.query('INSERT INTO changes (project_id, client, by_user, ops, at) VALUES ($1, $2, $3, $4, $5) RETURNING seq', [pid, client, user.id, JSON.stringify(out), now()])).rows[0];
    return { out, seq: r.seq };
  });
  return { ok: true, seq, ops: out };
});
route('DELETE', '/api/projects/:pid', async (req, res, { pid }) => {
  await requireManager(req, pid);
  await q('DELETE FROM projects WHERE id = $1', [pid]);
  return { ok: true };
});
route('GET', '/api/projects/:pid/members', async (req, res, { pid }) => {
  await requireManager(req, pid);
  return q('SELECT m.user_id AS "userId", u.name, m.role FROM members m JOIN users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY u.name', [pid]);
});
route('PUT', '/api/projects/:pid/members', async (req, res, { pid }) => {
  const { user, role: myRole } = await requireManager(req, pid);
  const body = await readJson(req, 10_000);
  const uid = id(body.userId, 'user');
  const target = await one('SELECT id, role, status FROM users WHERE id = $1', [uid]);
  if (!target) fail(404, 'User not found');
  if (target.status !== 'active') fail(400, 'That person\u2019s account isn\u2019t approved yet');
  if (target.role === 'owner') fail(400, 'Site owners can already open every project');
  const current = await one('SELECT role FROM members WHERE project_id = $1 AND user_id = $2', [pid, uid]);
  const isOwnerAct = myRole === 'owner';
  if (uid === user.id && !isOwnerAct) fail(400, 'You can\u2019t change your own access');
  if (current && current.role === 'manager' && !isOwnerAct) fail(403, 'Only the site owner can change a project manager\u2019s access');
  const newRole = body.role == null || body.role === '' ? null : body.role;
  if (newRole === 'manager' && !isOwnerAct) fail(403, 'Only the site owner can make someone a project manager');
  if (newRole === 'manager' && !['user', 'owner'].includes(target.role) && !(current && current.role === 'manager')) fail(400, 'Only accounts of type User can manage projects');
  if (newRole === null) await q('DELETE FROM members WHERE project_id = $1 AND user_id = $2', [pid, uid]);
  else if (['editor', 'viewer', 'manager'].includes(newRole)) await q(`INSERT INTO members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`, [pid, uid, newRole]);
  else fail(400, 'Role must be manager, editor or viewer');
  return { ok: true };
});

// --- live sync: send your presence, receive everyone else's changes since `since`
route('POST', '/api/sync', async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req, 10_000);
  const out = {};
  if (user.role === 'owner') out.pending = (await one("SELECT COUNT(*)::int AS n FROM users WHERE status = 'pending'")).n;
  const pid = typeof body.pid === 'string' && ID_RE.test(body.pid) ? body.pid : null;
  if (!pid) return out;
  const role = await projectRole(user, pid);
  if (!role) { out.gone = (await one('SELECT 1 FROM projects WHERE id = $1', [pid])) ? 'access' : 'deleted'; return out; }
  out.role = role;
  const client = typeof body.client === 'string' && ID_RE.test(body.client) ? body.client : null;
  const t = now();
  if (client) {
    const pr = body.presence && typeof body.presence === 'object' ? body.presence : {};
    const data = {
      tab: typeof pr.tab === 'string' ? pr.tab.slice(0, 20) : null,
      doc: typeof pr.doc === 'string' && ID_RE.test(pr.doc) ? pr.doc : null,
      sel: Array.isArray(pr.sel) && pr.sel.length === 2 && pr.sel.every(Number.isInteger) ? pr.sel : null,
    };
    await q(`INSERT INTO presence (project_id, client, user_id, data, seen) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id, client) DO UPDATE SET user_id = EXCLUDED.user_id, data = EXCLUDED.data, seen = EXCLUDED.seen`, [pid, client, user.id, JSON.stringify(data), t]);
  }
  const since = Number.isInteger(body.since) && body.since >= 0 ? body.since : 0;
  const [rows, peers] = await Promise.all([
    q('SELECT seq, client, ops FROM changes WHERE project_id = $1 AND seq > $2 ORDER BY seq LIMIT 300', [pid, since]),
    q('SELECT p.client, p.user_id AS "by", u.name, p.data FROM presence p JOIN users u ON u.id = p.user_id WHERE p.project_id = $1 AND p.seen > $2', [pid, t - PEER_TTL]),
  ]);
  out.changes = rows.map(r => ({ seq: r.seq, client: r.client, ops: JSON.parse(r.ops) }));
  out.more = rows.length === 300;
  out.peers = peers.map(p => ({ peer: p.client, client: p.client, by: p.by, name: p.name, presence: JSON.parse(p.data) }));
  return out;
});
route('POST', '/api/sync/leave', async (req) => {
  const user = await currentUser(req); if (!user) return { ok: true };
  const body = await readJson(req, 10_000);
  if (typeof body.client === 'string') await q('DELETE FROM presence WHERE client = $1 AND user_id = $2', [body.client, user.id]);
  return { ok: true };
});

// --- owner administration
route('GET', '/api/admin/overview', async (req) => {
  await requireOwner(req);
  const [users, projects, members] = await Promise.all([
    q("SELECT id, name, role, status, created, email, (google_sub IS NOT NULL) AS google FROM users ORDER BY (status = 'pending') DESC, name"),
    q(LIST_ALL),
    q('SELECT project_id AS "projectId", user_id AS "userId", role FROM members'),
  ]);
  return { users, projects: projects.map(r => ({ id: r.id, name: r.name, created: r.created, nDocs: r.nDocs })), members, settings: { signupsOpen: await signupsOpen() } };
});
// --- Dhivehi font (Faruma) uploaded by the owner, served to everyone (also on the log-in page)
const FONT_TYPES = [[[0x00, 0x01, 0x00, 0x00], 'font/ttf'], [[0x74, 0x72, 0x75, 0x65], 'font/ttf'], [[0x4f, 0x54, 0x54, 0x4f], 'font/otf'], [[0x77, 0x4f, 0x46, 0x46], 'font/woff'], [[0x77, 0x4f, 0x46, 0x32], 'font/woff2']];
const fontType = (buf) => { const hit = FONT_TYPES.find(([sig]) => sig.every((b, i) => buf[i] === b)); return hit ? hit[1] : null; };
route('PUT', '/api/admin/font', async (req) => {
  await requireOwner(req);
  const body = await readJson(req, 2_200_000);
  if (body.b64 === null) { await q("DELETE FROM settings WHERE key = 'font_faruma'"); return { ok: true }; }
  if (typeof body.b64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(body.b64)) fail(400, 'Invalid font file');
  const buf = Buffer.from(body.b64, 'base64');
  if (buf.length > 1_500_000) fail(413, 'Font file is too large (max 1.5 MB)');
  if (!fontType(buf)) fail(400, 'That file isn\u2019t a TrueType/OpenType/WOFF font');
  await q('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['font_faruma', body.b64]);
  return { ok: true };
});
route('GET', '/api/font/faruma', async (req, res) => {
  const r = await one("SELECT value FROM settings WHERE key = 'font_faruma'");
  if (!r) { res.writeHead(404, { 'Cache-Control': 'public, max-age=300', ...SECURITY_HEADERS }); res.end(); return undefined; }
  const buf = Buffer.from(r.value, 'base64');
  res.writeHead(200, { 'Content-Type': fontType(buf) || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=3600', ...SECURITY_HEADERS });
  res.end(buf); return undefined;
});
route('PATCH', '/api/admin/settings', async (req) => {
  await requireOwner(req);
  const body = await readJson(req, 10_000);
  if (typeof body.signupsOpen === 'boolean') await q('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['signupsOpen', body.signupsOpen ? '1' : '0']);
  return { ok: true, signupsOpen: await signupsOpen() };
});
route('PATCH', '/api/admin/users/:uid', async (req, res, { uid }) => {
  const me = await requireOwner(req); id(uid, 'user');
  const target = await one('SELECT * FROM users WHERE id = $1', [uid]); if (!target) fail(404, 'User not found');
  const body = await readJson(req, 10_000);
  if (body.status !== undefined) {
    if (!['active', 'disabled', 'pending'].includes(body.status)) fail(400, 'Invalid status');
    if (uid === me.id) fail(400, 'You can’t change your own status');
    await q('UPDATE users SET status = $1 WHERE id = $2', [body.status, uid]);
    if (body.status !== 'active') await q('DELETE FROM sessions WHERE user_id = $1', [uid]);
  }
  if (body.role !== undefined) {
    if (!['owner', 'user', 'member'].includes(body.role)) fail(400, 'Invalid role');
    if (target.role === 'owner' && body.role !== 'owner' && (await ownerCount()) <= 1) fail(400, 'There must be at least one owner');
    await q('UPDATE users SET role = $1 WHERE id = $2', [body.role, uid]);
  }
  return { ok: true };
});
route('POST', '/api/admin/users/:uid/password', async (req, res, { uid }) => {
  await requireOwner(req); id(uid, 'user');
  if (!(await one('SELECT 1 FROM users WHERE id = $1', [uid]))) fail(404, 'User not found');
  const body = await readJson(req, 10_000);
  await q('UPDATE users SET pass = $1 WHERE id = $2', [await hashPassword(validPassword(body.password)), uid]);
  await q('DELETE FROM sessions WHERE user_id = $1', [uid]);
  return { ok: true };
});
route('DELETE', '/api/admin/users/:uid', async (req, res, { uid }) => {
  const me = await requireOwner(req); id(uid, 'user');
  if (uid === me.id) fail(400, 'You can’t delete your own account');
  const target = await one('SELECT * FROM users WHERE id = $1', [uid]); if (!target) fail(404, 'User not found');
  if (target.role === 'owner' && target.status === 'active' && (await ownerCount()) <= 1) fail(400, 'There must be at least one owner');
  await q('DELETE FROM users WHERE id = $1', [uid]);
  return { ok: true };
});

/* ------------------------------------------------------------------ entry point */
async function handleApi(req, res) {
  const url = new URL(req.url, 'http://x');
  let p = url.pathname.replace(/\/+$/, '') || '/';
  // On Vercel every /api/* request is rewritten to /api/index; recover the original path.
  if ((p === '/api/index' || p === '/api') && url.searchParams.has('__path')) p = '/api/' + url.searchParams.get('__path').replace(/^\/+/, '');
  try {
    try { DB = await getDb(); }
    catch (e) {
      if (e instanceof NoDatabaseError) return sendJson(res, 503, { error: e.message, setup: true });
      console.error('Database connection failed:', e);
      return sendJson(res, 503, { error: 'The database can’t be reached right now. Check the DATABASE_URL setting and try again.', setup: true });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') checkOrigin(req);
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = p.match(r.re); if (!m) continue;
      const params = {}; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const out = await r.handler(req, res, params);
      housekeeping().catch(() => { });
      if (out !== undefined && !res.headersSent) sendJson(res, 200, out);
      return;
    }
    fail(404, 'Not found');
  } catch (e) {
    if (res.headersSent) { try { res.end(); } catch (_) { } return; }
    if (e instanceof HttpError) sendJson(res, e.status, { error: e.message });
    else { console.error(e); sendJson(res, 500, { error: 'Something went wrong on the server' }); }
  }
}

module.exports = { handleApi, hashPassword, getDb, nameKey };
