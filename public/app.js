"use strict";
/* ============ utilities ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v; // only used for static icon markup
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
}
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const THAANA = /[ހ-޿]/;
const isTh = s => THAANA.test(s || '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
function tint(h, t) { const [r, g, b] = hexRgb(h); const m = x => Math.round(x + (255 - x) * t); return '#' + [m(r), m(g), m(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function lum(h) { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }
const onColor = h => lum(h) > .42 ? '#1c1e22' : '#ffffff';
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const PALETTE = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#0d9488', '#a16207'];
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

const IC = {
  x: '<svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  edit: '<svg viewBox="0 0 16 16" fill="none"><path d="M10.5 3.5l2 2L6 12H4v-2l6.5-6.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 16 16" fill="none"><path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  up: '<svg viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  upload: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 11V3M5 6l3-3 3 3M3 11v2h10v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  doc: '<svg viewBox="0 0 16 16" fill="none"><path d="M4 2h5l3 3v9H4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 2v3h3" stroke="currentColor" stroke-width="1.3"/></svg>',
  eye: '<svg viewBox="0 0 16 16" fill="none"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>',
  menu: '<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  tag: '<svg viewBox="0 0 16 16" fill="none"><path d="M2.5 2.5h5l6 6-5 5-6-6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function toast(msg, kind) {
  const t = el('div', { class: 'toast' + (kind === 'err' ? ' err' : ''), text: msg });
  $('#toasts').append(t); setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3000);
}

/* ============ modal helpers ============ */
const modalStack = [];
function modal({ title, body, actions, wide, onClose }) {
  const back = el('div', { class: 'modal-back' });
  const box = el('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog' },
    el('div', { class: 'modal-head' }, el('h3', { text: title }), el('button', { class: 'icon-btn', 'aria-label': 'Close', html: IC.x, onclick: () => close() })),
    el('div', { class: 'modal-body' }, body),
    actions && actions.length ? el('div', { class: 'modal-foot' }, actions) : null);
  back.append(box);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  $('#modalRoot').append(back);
  let closed = false;
  function close() { if (closed) return; closed = true; back.remove(); const i = modalStack.indexOf(api); if (i >= 0) modalStack.splice(i, 1); onClose && onClose(); }
  const api = { close, box };
  modalStack.push(api);
  setTimeout(() => { const f = box.querySelector('input[type=text],textarea'); f && f.focus(); }, 30);
  return api;
}
function ask(msg, okLabel = 'Delete', danger = true) {
  return new Promise(res => {
    let done = false;
    const m = modal({
      title: 'Please confirm', body: el('p', { text: msg, style: { margin: '4px 0 8px' } }),
      actions: [el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }),
        el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), text: okLabel, onclick: () => { done = true; m.close(); res(true); } })],
      onClose: () => { if (!done) res(false); }
    });
  });
}
function promptText(title, label, value = '', okLabel = 'Save') {
  return new Promise(res => {
    let done = false;
    const inp = el('input', { type: 'text', value, dir: 'auto' });
    const go = () => { const v = inp.value.trim(); if (!v) return; done = true; m.close(); res(v); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    const m = modal({ title, body: el('label', { class: 'field' }, el('span', { text: label }), inp),
      actions: [el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }), el('button', { class: 'btn primary', text: okLabel, onclick: go })],
      onClose: () => { if (!done) res(null); } });
  });
}

/* ============ state ============ */
let P = null; // current project
const UI = {
  tab: 'code', docId: null, focus: null, jump: -1, pending: null, recent: {},
  map: { layout: lsGet('tc:mapLayout') || 'mindmap', counts: true, unassigned: false, codes: true },
  seg: { theme: '', code: '', doc: '', q: '', by: '' }, newSpace: lsGet('tc:newSpace') || 'team', readOnly: false,
  docSize: +(lsGet('tc:docSize') || 15),
};
const textCache = new Map();
function fullText(d) {
  let c = textCache.get(d.id);
  if (!c || c.paras !== d.paras) {
    const starts = []; let pos = 0;
    for (const p of d.paras) { starts.push(pos); pos += p.length + 1; }
    c = { paras: d.paras, text: d.paras.join('\n'), starts };
    textCache.set(d.id, c);
  }
  return c;
}
const segText = (d, s) => fullText(d).text.slice(s.s, s.e);
function paraIndexAt(d, off) { const st = fullText(d).starts; let lo = 0, hi = st.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (st[mid] <= off) lo = mid; else hi = mid - 1; } return lo; }
const codeById = id => P.codes.find(c => c.id === id);
const themeById = id => P.themes.find(t => t.id === id);
const topThemes = () => P.themes.filter(t => !t.parent || !themeById(t.parent));
const subThemes = tid => P.themes.filter(t => t.parent === tid);
const docsInOrder = () => docsInOrderOf(P);
const curDoc = () => (UI.docId && P.docs[UI.docId]) || null;
function themePath(code) {
  const t = code.theme && themeById(code.theme); if (!t) return { top: null, sub: null };
  const parent = t.parent && themeById(t.parent);
  return parent ? { top: parent, sub: t } : { top: t, sub: null };
}
function stats() {
  const cnt = new Map(), docs = new Map();
  for (const d of docsInOrder()) for (const s of d.segments) for (const c of s.c) {
    cnt.set(c, (cnt.get(c) || 0) + 1);
    if (!docs.has(c)) docs.set(c, new Set()); docs.get(c).add(d.id);
  }
  return { cnt, docs };
}
function nextColor(list) {
  const used = new Map(); list.forEach(x => used.set(x.color, (used.get(x.color) || 0) + 1));
  let best = PALETTE[0], bn = Infinity;
  for (const c of PALETTE) { const n = used.get(c) || 0; if (n < bn) { bn = n; best = c; } }
  return best;
}
function newProject(name, space) {
  return { id: 'p' + uid(), type: 'project', space: space || 'local', name, center: '', codes: [], themes: [], docOrder: [], docs: {}, created: Date.now(), updated: Date.now(), by: null };
}

/* ============ server connection ============ */
const API = {
  async req(method, url, body) {
    let r;
    try {
      r = await fetch(url, { method, credentials: 'same-origin', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) { throw { code: 'network', message: 'Can’t reach the server — check your connection' }; }
    let data = null; try { data = await r.json(); } catch (e) { }
    if (r.status === 401 && !url.startsWith('/api/auth/')) { location.href = '/login'; throw { code: 401, message: 'Please log in again' }; }
    if (!r.ok) throw { code: r.status, message: (data && data.error) || ('Request failed (' + r.status + ')') };
    return data;
  },
  get: u => API.req('GET', u), post: (u, b) => API.req('POST', u, b || {}), put: (u, b) => API.req('PUT', u, b || {}),
  patch: (u, b) => API.req('PATCH', u, b || {}), del: u => API.req('DELETE', u),
};
const ME = { id: null, name: '', role: 'member', email: null, google: false, hasPassword: true };
const isOwner = () => ME.role === 'owner';
const Store = { uid: null };
const CLIENT_ID = 'k' + uid();

function docsInOrderOf(p) {
  const out = [], seen = new Set();
  for (const id of p.docOrder) { const d = p.docs[id]; if (d && !seen.has(id)) { out.push(d); seen.add(id); } }
  Object.values(p.docs).filter(d => !seen.has(d.id)).sort((a, b) => (a.added || 0) - (b.added || 0)).forEach(d => out.push(d));
  return out;
}
function serialize(p) {
  return {
    app: 'thematic-coder', version: 2, id: p.id, name: p.name, center: p.center || '', created: p.created,
    codes: p.codes, themes: p.themes, docOrder: docsInOrderOf(p).map(d => d.id),
    docs: docsInOrderOf(p).map(d => ({ id: d.id, name: d.name, added: d.added, paras: d.paras, segments: d.segments.map(s => ({ id: s.id, s: s.s, e: s.e, c: s.c, m: s.m || '', by: s.by || null, at: s.at || 0 })) })),
  };
}
function deserialize(o) {
  const p = newProject(o.name || 'Imported project');
  p.center = o.center || ''; p.created = o.created || Date.now();
  p.codes = (o.codes || []).map((c, i) => ({ id: c.id, name: c.name, color: c.color || PALETTE[0], desc: c.desc || '', theme: c.theme || null, at: c.at || i + 1 }));
  p.themes = (o.themes || []).map((t, i) => ({ id: t.id, name: t.name, color: t.color || PALETTE[0], desc: t.desc || '', parent: t.parent || null, order: t.order != null ? t.order : i }));
  for (const d of (o.docs || [])) {
    p.docs[d.id] = { id: d.id, name: d.name, added: d.added || Date.now(), paras: d.paras || [], loaded: true,
      segments: (d.segments || []).map(s => ({ id: s.id || 's' + uid(), s: s.s, e: s.e, c: [...(s.c || [])], m: s.m || '', by: s.by || null, at: s.at || 0 })) };
    p.docOrder.push(d.id);
  }
  return p;
}
function projectFromServer(x) {
  const p = newProject(x.name);
  p.id = x.id; p.center = x.center || ''; p.created = x.created; p.by = x.createdBy; p.docOrder = [...(x.docOrder || [])];
  p.codes = x.codes.map(c => ({ id: c.id, name: c.name, color: c.color, desc: c.desc || '', theme: c.theme || null, at: c.at || 0 }));
  p.themes = x.themes.map(t => ({ id: t.id, name: t.name, color: t.color, desc: t.desc || '', parent: t.parent || null, order: t.order || 0 }));
  x.docs.forEach(d => { p.docs[d.id] = { id: d.id, name: d.name, added: d.added, paras: d.paras || [], segments: [], loaded: !!d.paras }; });
  x.segs.forEach(s => { const d = p.docs[s.doc]; if (d) d.segments.push(segFrom(s.id, s)); });
  sortList(p);
  return p;
}
function canon(o) {
  if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
  if (o && typeof o === 'object') return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
  return JSON.stringify(o === undefined ? null : o);
}
const segData = (did, s) => ({ doc: did, s: s.s, e: s.e, c: s.c, m: s.m || '', by: s.by || null, at: s.at || 0 });
function entities(p) {
  const m = new Map();
  m.set('m', { data: { name: p.name, center: p.center || '', docOrder: docsInOrderOf(p).map(d => d.id) } });
  for (const c of p.codes) m.set('c:' + c.id, { data: { name: c.name, color: c.color, desc: c.desc || '', theme: c.theme || null, at: c.at || 0 } });
  for (const t of p.themes) m.set('t:' + t.id, { data: { name: t.name, color: t.color, desc: t.desc || '', parent: t.parent || null, order: t.order || 0 } });
  for (const d of Object.values(p.docs)) {
    m.set('d:' + d.id, { data: { name: d.name, added: d.added || 0 } });
    for (const s of d.segments) m.set('s:' + s.id, { data: segData(d.id, s) });
  }
  return m;
}
const RANK = { m: 0, t: 1, c: 2, d: 3, s: 4 };
const segFrom = (id, x) => ({ id, s: x.s, e: x.e, c: [...(x.c || [])], m: x.m || '', by: x.by || null, at: x.at || 0 });
function sortList(p) { p.codes.sort((a, b) => (a.at || 0) - (b.at || 0)); p.themes.sort((a, b) => (a.order || 0) - (b.order || 0)); }
function baseFrom(p) { const b = new Map(); for (const [k, v] of entities(p)) b.set(k, canon(v.data)); return b; }

/* ---- live sync: what's on the server vs. what changed here ---- */
const Sync = { base: new Map() };
function applyRemoteOps(ops) {
  const cur = entities(P); let changed = false;
  for (const op of ops) {
    const k = op.k === 'm' ? 'm' : op.k + ':' + op.id;
    const b = Sync.base.get(k), loc = cur.get(k), lj = loc ? canon(loc.data) : null;
    if (op.data === null) {
      if (!loc) { Sync.base.delete(k); continue; }
      if (lj === b) { removeLocal(op.k, op.id); Sync.base.delete(k); cur.delete(k); changed = true; }
      continue;
    }
    let data = op.data, paras = null;
    if (op.k === 'd') {
      if (Array.isArray(data.paras)) paras = data.paras;
      if (data.hasText && P.docs[op.id] && !paras) loadTextFor(P.docs[op.id]);
      data = { name: data.name, added: data.added };
    }
    if (paras && P.docs[op.id]) { P.docs[op.id].paras = paras; P.docs[op.id].loaded = true; changed = true; }
    const j = canon(data);
    if (b === j) continue;
    if (lj === j) { Sync.base.set(k, j); continue; }
    const clean = loc ? lj === b : b === undefined;
    if (!clean) continue; // you have an unsaved edit to the same item; yours is sent next and wins
    upsertLocal(op.k, op.id, data, paras); Sync.base.set(k, j); cur.set(k, { data }); changed = true;
  }
  if (changed) { sortList(P); remoteChanged(); }
}
function findSeg(id) { for (const d of Object.values(P.docs)) { const s = d.segments.find(x => x.id === id); if (s) return { d, s }; } return null; }
function upsertLocal(kind, id, x, paras) {
  if (kind === 'm') {
    P.name = x.name || P.name; P.center = x.center || '';
    const order = [...(x.docOrder || [])]; Object.keys(P.docs).forEach(i => { if (!order.includes(i)) order.push(i); }); P.docOrder = order;
  }
  else if (kind === 'c') { const v = { name: x.name || '', color: x.color || PALETTE[0], desc: x.desc || '', theme: x.theme || null, at: x.at || 0 }; const c = codeById(id); if (c) Object.assign(c, v); else P.codes.push({ id, ...v }); }
  else if (kind === 't') { const v = { name: x.name || '', color: x.color || PALETTE[0], desc: x.desc || '', parent: x.parent || null, order: x.order || 0 }; const t = themeById(id); if (t) Object.assign(t, v); else P.themes.push({ id, ...v }); }
  else if (kind === 'd') {
    let d = P.docs[id];
    if (d) { d.name = x.name || d.name; d.added = x.added || d.added; }
    else {
      d = { id, name: x.name || 'Untitled', added: x.added || 0, paras: paras || [], segments: [], loaded: !!paras };
      P.docs[id] = d; if (!P.docOrder.includes(id)) P.docOrder.push(id);
      if (!paras) loadTextFor(d);
    }
  }
  else if (kind === 's') {
    const hit = findSeg(id); const v = segFrom(id, x);
    if (hit && hit.d.id === x.doc) Object.assign(hit.s, v);
    else { if (hit) hit.d.segments = hit.d.segments.filter(s => s !== hit.s); const d = P.docs[x.doc]; if (d) d.segments.push(v); }
  }
}
function removeLocal(kind, id) {
  if (kind === 'c') { P.codes = P.codes.filter(c => c.id !== id); if (UI.focus === id) UI.focus = null; }
  else if (kind === 't') P.themes = P.themes.filter(t => t.id !== id);
  else if (kind === 'd') { delete P.docs[id]; P.docOrder = P.docOrder.filter(x => x !== id); if (UI.docId === id) UI.docId = docsInOrder()[0] ? docsInOrder()[0].id : null; }
  else if (kind === 's') { const hit = findSeg(id); if (hit) hit.d.segments = hit.d.segments.filter(s => s !== hit.s); }
}
async function loadAllTexts(p) {
  const todo = Object.values(p.docs).filter(d => !d.loaded);
  let i = 0;
  const worker = async () => { while (i < todo.length && P === p) { const d = todo[i++]; await loadTextFor(d); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
}
async function ensureAllText() {
  if (!P) return;
  const missing = Object.values(P.docs).filter(d => !d.loaded);
  if (!missing.length) return;
  toast('Loading transcripts…');
  await loadAllTexts(P);
}
async function loadTextFor(d) {
  const p = P; d.loaded = false;
  try { const r = await API.get('/api/projects/' + p.id + '/docs/' + d.id); if (P !== p) return; d.paras = r.paras; d.loaded = true; remoteChanged(); }
  catch (e) { toast('Couldn’t load “' + d.name + '”: ' + e.message, 'err'); }
}
function projectGone(reason) {
  P = null; Sync.base = new Map(); UI.readOnly = false; peers = []; renderPeers();
  toast(reason === 'access' ? 'You no longer have access to that project.' : 'This project was deleted by the owner.', 'err');
  joinRoom(); render();
}

/* save queue */
const dirty = { meta: false, docs: new Set(), text: new Set() };
let saveChain = Promise.resolve(), saveTimer = null, pendingSave = false, retryTimer = null;
function touch(kind, id) {
  if (!P) return;
  P.updated = Date.now();
  if (kind === 'meta') dirty.meta = true;
  else if (kind === 'doc') dirty.docs.add(id);
  else if (kind === 'text') dirty.text.add(id);
  scheduleSave();
}
function scheduleSave(delay) {
  pendingSave = true; setStatus('pending');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveChain = saveChain.then(flush); }, delay || 350);
}
async function flush() {
  if (!P || UI.readOnly) return;
  const p = P;
  const texts = new Set(dirty.text); dirty.meta = false; dirty.docs.clear(); dirty.text.clear();
  const cur = entities(p); const ops = []; const nb = [];
  for (const [k, v] of cur) {
    const j = canon(v.data); const isNewText = k[0] === 'd' && texts.has(k.slice(2));
    if (Sync.base.get(k) !== j || isNewText) {
      const data = { ...v.data }; if (isNewText) data.paras = p.docs[k.slice(2)].paras;
      ops.push({ k: k[0], id: k === 'm' ? null : k.slice(2), data }); nb.push([k, j]);
    }
  }
  const dels = [...Sync.base.keys()].filter(k => !cur.has(k));
  ops.sort((a, b) => RANK[a.k] - RANK[b.k]);
  dels.sort((a, b) => RANK[b[0]] - RANK[a[0]]).forEach(k => { ops.push({ k: k[0], id: k.slice(2), data: null }); nb.push([k, null]); });
  if (!ops.length) { pendingSave = !!saveTimer; setStatus(pendingSave ? 'pending' : 'saved'); return; }
  setStatus('saving');
  try {
    await API.post('/api/projects/' + p.id + '/ops', { ops, client: CLIENT_ID });
    if (P !== p) return;
    nb.forEach(([k, j]) => j === null ? Sync.base.delete(k) : Sync.base.set(k, j));
    pendingSave = !!saveTimer; setStatus(pendingSave ? 'pending' : 'saved');
  } catch (e) {
    texts.forEach(x => dirty.text.add(x));
    if (P !== p) return;
    if (e.code === 403) { UI.readOnly = true; showBanner('You can view this project but not change it. Ask the owner if you need to code.'); pendingSave = false; openProject(p.id, true); return; }
    if (e.code === 404) { projectGone('access'); return; }
    setStatus('error', e);
    if (e.code === 409 || e.code === 400) { toast('A change couldn’t be saved (' + e.message + '). Reloading the latest version.', 'err'); pendingSave = false; openProject(p.id, true); return; }
    clearTimeout(retryTimer); retryTimer = setTimeout(() => { if (P === p) scheduleSave(); }, 4000);
  }
}
async function flushNow() { clearTimeout(saveTimer); saveTimer = null; saveChain = saveChain.then(flush); await saveChain; }
function setStatus(s, err) {
  const st = $('#status'); st.className = 'status ' + s;
  const lbl = s === 'saved' ? (Live.connected ? 'Saved · live' : 'Saved (offline?)') : (s === 'saving' || s === 'pending') ? 'Saving…' : s === 'error' ? 'Not saved — ' + ((err && err.message) || 'error') : '';
  st.querySelector('.lbl').textContent = s === 'error' ? 'Not saved — retrying' : (UI.readOnly && P ? 'View only' : lbl);
  st.title = lbl;
}
$('#status').addEventListener('click', () => { if ($('#status').classList.contains('error')) scheduleSave(); });
window.addEventListener('beforeunload', e => { if (pendingSave) { e.preventDefault(); e.returnValue = ''; } });
function ro() { if (UI.readOnly) { toast('You have view-only access to this project.', 'err'); return true; } return false; }

/* ---- refresh after collaborators' changes ---- */
let rrTimer = null, dragging = false;
function remoteChanged() { clearTimeout(rrTimer); rrTimer = setTimeout(refreshAfterRemote, 120); }
function docBusy() {
  if (!$('#pop').classList.contains('hidden')) return true;
  const sel = getSelection(); const body = $('.doc-body');
  return !!(sel && !sel.isCollapsed && body && sel.rangeCount && body.contains(sel.getRangeAt(0).commonAncestorContainer));
}
function refreshAfterRemote() {
  if (!P) { if (UI.tab !== 'admin') render(); return; }
  $('#projName').textContent = P.name;
  if (UI.tab === 'code' && $('#codebook')) {
    if (!P.docs[UI.docId]) UI.docId = docsInOrder()[0] ? docsInOrder()[0].id : null;
    renderCodebook(); renderDocList(); renderDocBar();
    if (docBusy()) UI.docStale = true; else renderDoc();
    return;
  }
  if (UI.tab === 'admin') return;
  const ae = document.activeElement;
  if (dragging || (ae && $('#main').contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) { UI.viewStale = true; return; }
  if (UI.tab === 'map' && mapView && mapView.svg && document.contains(mapView.svg)) { drawMap(false); return; }
  render(true);
}
document.addEventListener('focusout', () => setTimeout(() => { if (UI.viewStale) { UI.viewStale = false; refreshAfterRemote(); } }, 0));
function scheduleDocRefresh() { if (UI.tab !== 'code') return; if (docBusy()) UI.docStale = true; else renderDoc(); }

/* ---- live updates: short polling (works on Vercel and any server) ---- */
const Live = { connected: false, since: 0, timer: null, busy: false, fails: 0, lastActivity: Date.now(), presenceDirty: true };
function liveInterval() {
  if (document.hidden) return 5000;
  if (!P) return 10000;
  const quiet = Date.now() - Live.lastActivity > 120000 && !projectPeers().length;
  return quiet ? 5000 : 2000;
}
function scheduleSync(ms) { clearTimeout(Live.timer); Live.timer = setTimeout(syncNow, ms == null ? liveInterval() : ms); }
async function syncNow() {
  if (Live.busy) return scheduleSync(300);
  Live.busy = true;
  const p = P;
  try {
    const r = await API.post('/api/sync', { pid: p ? p.id : null, since: Live.since, client: CLIENT_ID, presence: currentPresence() });
    Live.fails = 0;
    if (!Live.connected) { Live.connected = true; if (/saved/.test($('#status').className)) setStatus('saved'); }
    if (r.pending != null) setAdminBadge(r.pending);
    if (p && P === p) {
      if (r.gone) { projectGone(r.gone); return; }
      if (r.role) {
        const ro2 = r.role === 'viewer';
        if (ro2 !== UI.readOnly) { UI.readOnly = ro2; UI.role = r.role; toast(ro2 ? 'You now have view-only access to this project.' : 'You can now code in this project.'); render(true); setStatus('saved'); }
      }
      for (const ch of r.changes || []) {
        if (ch.client !== CLIENT_ID) { applyRemoteOps(ch.ops); Live.lastActivity = Date.now(); }
        Live.since = Math.max(Live.since, ch.seq);
      }
      (r.peers || []).forEach(x => { if (x.by && x.name) people.set(x.by, { name: x.name }); });
      const next = (r.peers || []).filter(x => x.client !== CLIENT_ID).map(x => ({ peer: x.peer, by: x.by, presence: { ...x.presence, pid: p.id } }));
      const sig = JSON.stringify(next);
      if (sig !== Live.peerSig) { Live.peerSig = sig; peers = next; onPeersChanged(); }
      if (r.more) { Live.busy = false; return scheduleSync(50); }
    }
  } catch (e) {
    Live.fails++;
    if (Live.connected && Live.fails > 2) { Live.connected = false; if (/saved/.test($('#status').className)) setStatus('saved'); }
  } finally { Live.busy = false; }
  scheduleSync(Live.fails ? Math.min(20000, 2000 * Live.fails) : undefined);
}
function currentPresence() { return { tab: UI.tab, doc: P && UI.tab === 'code' ? UI.docId : null, sel: UI.pending ? [UI.pending.s, UI.pending.e] : null }; }
function joinRoom() { Live.peerSig = ''; peers = []; renderPeers(); scheduleSync(0); }
function startLive() {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(0); });
  window.addEventListener('pagehide', () => { try { navigator.sendBeacon && navigator.sendBeacon('/api/sync/leave', new Blob([JSON.stringify({ client: CLIENT_ID })], { type: 'application/json' })); } catch (e) { } });
  scheduleSync(0);
}
function liveSend() { }

/* ---- who's here (presence) ---- */
let peers = [], lastPeerSig = '';
const people = new Map();
const peerId = x => x.by || null;
const projectPeers = () => P ? peers.filter(x => x.presence && x.presence.pid === P.id) : [];
let peopleLoading = null;
async function loadPeople() {
  if (peopleLoading) return peopleLoading;
  peopleLoading = API.get('/api/people').then(list => { list.forEach(u => people.set(u.id, { name: u.name })); }).catch(() => { }).finally(() => { setTimeout(() => peopleLoading = null, 5000); });
  return peopleLoading;
}
async function resolvePeople(ids) {
  const need = ids.filter(i => i && !people.has(i)); if (!need.length) return;
  await loadPeople();
  need.forEach(i => { if (!people.has(i)) people.set(i, { name: '' }); });
  renderPeers(); if (UI.tab === 'segments') remoteChanged();
}
function personName(id) { if (!id) return 'Unknown'; if (id === Store.uid) return 'You'; const p = people.get(id); return (p && p.name) || 'Former member'; }
function personColor(id) { let h = 0; for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
function initials(name) { const w = String(name || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
function avatar(id, size) {
  const s = size || 26; const c = personColor(id);
  return el('span', { class: 'av', text: initials((people.get(id) || {}).name || '?'), style: { width: s + 'px', height: s + 'px', background: c, color: '#fff', fontSize: Math.round(s * .42) + 'px' } });
}
function onPeersChanged() {
  renderPeers();
  if (UI.tab === 'code' && P) {
    renderDocList();
    const sig = JSON.stringify(projectPeers().filter(x => x.presence.doc === UI.docId).map(x => [x.peer, x.presence.sel]));
    if (sig !== lastPeerSig) { lastPeerSig = sig; scheduleDocRefresh(); }
  }
}
function updatePresence() {
  Live.lastActivity = Date.now(); clearTimeout(Live.presT); Live.presT = setTimeout(() => scheduleSync(0), 150);
}
function peerActivity(x) {
  const pr = x.presence || {};
  if (pr.tab === 'code' && pr.doc && P && P.docs[pr.doc]) return (pr.sel ? 'coding in ' : 'reading ') + P.docs[pr.doc].name;
  return { themes: 'arranging themes', map: 'viewing the theme map', segments: 'reviewing coded segments', overview: 'viewing the overview', admin: 'in Admin' }[pr.tab] || 'here';
}
function renderPeers() {
  const host = $('#peers'); if (!host) return; host.innerHTML = '';
  const byPerson = new Map();
  projectPeers().forEach(x => { const id = peerId(x) || x.peer; if (!byPerson.has(id)) byPerson.set(id, x); });
  const arr = [...byPerson.entries()];
  if (!arr.length) return;
  arr.slice(0, 5).forEach(([id, x]) => { const a = avatar(id); a.title = (id === Store.uid ? 'You (another tab)' : personName(id)) + ' — ' + peerActivity(x); host.append(a); });
  if (arr.length > 5) host.append(el('span', { class: 'av more', text: '+' + (arr.length - 5) }));
  host.append(el('span', { class: 'peers-lbl', text: arr.length === 1 ? '1 other here' : arr.length + ' others here' }));
}

/* ============ downloads ============ */
function saveFile(filename, data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const safeName = s => (s || 'export').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'export';

/* ============ document import ============ */
function splitLong(paras) {
  const out = [];
  for (let p of paras) { while (p.length > 20000) { let cut = p.lastIndexOf(' ', 20000); if (cut < 15000) cut = 20000; out.push(p.slice(0, cut)); p = p.slice(cut).trimStart(); } if (p) out.push(p); }
  return out;
}
async function waitFor(name, ms = 8000) { const t = Date.now(); while (!window[name] && Date.now() - t < ms) await sleep(150); return window[name]; }
async function parseDocx(buf) {
  const mammoth = await waitFor('mammoth');
  if (!mammoth) throw new Error('the Word reader could not load. Check your connection and try again');
  const r = await mammoth.convertToHtml({ arrayBuffer: buf });
  const d = new DOMParser().parseFromString(r.value, 'text/html');
  const out = [];
  d.body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th').forEach(node => {
    if (node.matches('td,th') && node.querySelector('p,li')) return;
    if (node.closest('li') && node.matches('p')) return;
    let src = node;
    if (node.matches('li')) { src = node.cloneNode(true); src.querySelectorAll('ul,ol').forEach(x => x.remove()); }
    const t = src.textContent.replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
    if (t) out.push(t);
  });
  return out;
}
const parseTxt = s => s.replace(/\r\n?/g, '\n').split('\n').map(x => x.replace(/[\t ]+/g, ' ').trim()).filter(Boolean);
async function handleFiles(files) {
  if (!P || ro()) return;
  let added = 0;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const base = f.name.replace(/\.[^.]+$/, '');
    try {
      let paras;
      if (ext === 'docx') paras = await parseDocx(await f.arrayBuffer());
      else if (ext === 'txt') paras = parseTxt(await f.text());
      else if (ext === 'doc') { toast(`“${f.name}” is an old .doc file. Open it in Word and use Save As → .docx.`, 'err'); continue; }
      else { toast(`“${f.name}” isn’t a .docx or .txt file.`, 'err'); continue; }
      if (!paras.length) { toast(`No text found in “${f.name}”.`, 'err'); continue; }
      addDoc(base, paras); added++;
    } catch (e) { toast(`Couldn’t read “${f.name}”: ${e.message || e}`, 'err'); }
  }
  if (added) { toast(added === 1 ? 'Transcript added' : added + ' transcripts added'); render(); }
}
function addDoc(name, paras) {
  const sp = splitLong(paras);
  const d = { id: 'd' + uid(), name, added: Date.now(), paras: sp, segments: [], loaded: true };
  P.docs[d.id] = d; P.docOrder.push(d.id); UI.docId = d.id;
  touch('meta'); touch('text', d.id);
  return d;
}
$('#fileIn').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; handleFiles(fs); });
function pasteModal() {
  if (ro()) return;
  const name = el('input', { type: 'text', placeholder: 'e.g. Interview 03 – Participant C', dir: 'auto' });
  const ta = el('textarea', { class: 'big', dir: 'auto', placeholder: 'Paste the transcript here. Each line becomes a paragraph.' });
  const m = modal({ title: 'Paste a transcript', wide: true, body: el('div', {}, el('label', { class: 'field' }, el('span', { text: 'Document name' }), name), el('label', { class: 'field' }, el('span', { text: 'Text (Dhivehi or English)' }), ta)),
    actions: [el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }), el('button', { class: 'btn primary', text: 'Add document', onclick: () => {
      const paras = parseTxt(ta.value); if (!paras.length) { toast('Paste some text first.', 'err'); return; }
      addDoc(name.value.trim() || 'Pasted transcript', paras); m.close(); render();
    } })] });
}

/* ============ rendering: shell ============ */
$$('#tabs button').forEach(b => b.addEventListener('click', () => { if (!P && b.dataset.tab !== 'admin') return; UI.tab = b.dataset.tab; closePop(); render(); updatePresence(); }));
$('#projBtn').addEventListener('click', projectsModal);
function render(keepScroll) {
  const scroll = {}; if (keepScroll) ['.seg-page', '.board', '.ov', '#docScroll', '.tbl-wrap'].forEach(q => { const e = $(q); if (e) scroll[q] = [e.scrollTop, e.scrollLeft]; });
  $('#projName').textContent = P ? P.name : 'No project';
  $('#projName').dir = 'auto';
  $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === UI.tab && (!!P || b.dataset.tab === 'admin')); b.disabled = !P && b.dataset.tab !== 'admin'; });
  const m = $('#main'); m.innerHTML = '';
  closePop(true);
  if (UI.tab === 'admin' && isOwner()) { renderAdmin(m); return; }
  if (!P) { m.append(welcome()); return; }
  ({ code: renderCode, themes: renderThemes, map: renderMap, segments: renderSegments, overview: renderOverview })[UI.tab](m);
  for (const q in scroll) { const e = $(q); if (e) { e.scrollTop = scroll[q][0]; e.scrollLeft = scroll[q][1]; } }
}
function showBanner(html, btn) {
  const b = $('#banner'); b.innerHTML = ''; b.append(el('span', { text: html }));
  if (btn) b.append(btn);
  b.append(el('button', { class: 'icon-btn', html: IC.x, onclick: () => { b.classList.add('hidden'); document.body.classList.remove('has-banner'); } }));
  b.classList.remove('hidden'); document.body.classList.add('has-banner');
}

function welcome() {
  const owner = isOwner();
  return el('div', { class: 'welcome' },
    el('h1', { text: owner ? 'Code your interviews into themes — together' : 'Welcome, ' + ME.name }),
    el('p', { text: owner ? 'Create a project, upload Word transcripts in Dhivehi or English, then give your members access. Everyone with access can code at the same time and see each other\u2019s work live.'
      : 'You haven\u2019t been added to a project yet. When the owner gives you access, your projects will appear here — open Projects at the top, or refresh this page.' }),
    el('div', { class: 'steps' },
      [['Upload', 'Add .docx or .txt transcripts'], ['Code', 'Select text, attach one or more codes'], ['Theme', 'Drag codes into themes and sub-themes'], ['Map', 'Generate a diagram and export it']]
        .map(([b, s], i) => el('div', { class: 'step' }, el('div', { class: 'n', text: i + 1 }), el('b', { text: b }), el('span', { text: s })))),
    owner ? el('div', { class: 'row' },
      el('button', { class: 'btn primary', text: 'Start a new project', onclick: () => newProjectFlow() }),
      el('button', { class: 'btn', text: 'Add the sample project', onclick: sampleFlow }),
      el('button', { class: 'btn ghost', text: 'Import a project file (.json)', onclick: () => $('#jsonIn').click() }),
      el('button', { class: 'btn ghost', text: 'Admin: approve sign-ups', onclick: () => { UI.tab = 'admin'; render(); } }))
      : el('div', { class: 'row' }, el('button', { class: 'btn primary', text: 'Check my projects', onclick: projectsModal })));
}

/* ============ projects ============ */
async function openProject(pid, quiet) {
  if (!quiet) await flushNow();
  try {
    const x = await API.get('/api/projects/' + pid);
    P = projectFromServer(x); Sync.base = baseFrom(P); Live.since = x.seq || 0;
    loadAllTexts(P);
    UI.readOnly = x.role === 'viewer'; UI.role = x.role;
    if (!quiet) { UI.docId = docsInOrder()[0] ? docsInOrder()[0].id : null; UI.focus = null; if (UI.tab === 'admin' || !UI.tab) UI.tab = 'code'; }
    else if (!P.docs[UI.docId]) UI.docId = docsInOrder()[0] ? docsInOrder()[0].id : null;
    textCache.clear(); pendingSave = false;
    lsSet('tc:last', pid); setStatus('saved'); joinRoom(); render(quiet);
  } catch (e) { toast('Couldn’t open the project: ' + e.message, 'err'); if (!P) render(); }
}
async function openNewProject(p) {
  if (!isOwner()) { toast('Only the owner can create projects.', 'err'); return; }
  try {
    toast('Creating project…');
    const all = serialize(p);
    const r = await API.post('/api/projects', { name: all.name, center: all.center, codes: all.codes, themes: all.themes });
    // add documents one at a time (keeps every request small enough for hosts like Vercel)
    const docOrder = [];
    for (const d of all.docs) {
      await API.post('/api/projects/' + r.id + '/ops', { client: CLIENT_ID, import: true, ops: [{ k: 'd', id: d.id, data: { name: d.name, added: d.added, paras: d.paras } }] });
      docOrder.push(d.id);
      for (let i = 0; i < d.segments.length; i += 1500) {
        const ops = d.segments.slice(i, i + 1500).map(sg => ({ k: 's', id: sg.id, data: { doc: d.id, s: sg.s, e: sg.e, c: sg.c, m: sg.m || '', by: sg.by || Store.uid, at: sg.at || Date.now() } }));
        await API.post('/api/projects/' + r.id + '/ops', { client: CLIENT_ID, import: true, ops });
      }
    }
    await API.post('/api/projects/' + r.id + '/ops', { client: CLIENT_ID, ops: [{ k: 'm', id: null, data: { name: all.name, center: all.center, docOrder } }] });
    UI.tab = 'code';
    await openProject(r.id);
    toast('Project created. Use Projects → Members to give people access.');
  } catch (e) { toast('Couldn’t create the project: ' + e.message, 'err'); }
}
async function newProjectFlow() {
  const n = await promptText('New project', 'Project name', '', 'Create');
  if (n) await openNewProject(newProject(n));
}
function sampleFlow() { openNewProject(sampleProject()); }
const roleLabel = r => r === 'owner' ? 'Owner' : r === 'editor' ? 'Can code' : 'View only';
async function projectsModal() {
  const list = el('div', {}, el('div', { class: 'hint', text: 'Loading…' }));
  const m = modal({ title: 'Projects', wide: true, body: el('div', {}, list,
    el('div', { class: 'row', style: { margin: '6px 0 10px' } },
      isOwner() ? el('button', { class: 'btn primary', html: IC.plus + ' New project', onclick: () => { m.close(); newProjectFlow(); } }) : null,
      isOwner() ? el('button', { class: 'btn', text: 'Import .json', onclick: () => { m.close(); $('#jsonIn').click(); } }) : null,
      isOwner() ? el('button', { class: 'btn', text: 'Add sample project', onclick: () => { m.close(); sampleFlow(); } }) : null,
      P ? el('button', { class: 'btn', text: 'Export current project', onclick: exportProject }) : null),
    el('p', { class: 'hint', text: isOwner() ? 'You can see every project. Use “Members” to choose who can view or code each one.' : 'These are the projects the owner has shared with you.' })) });
  let items = [];
  try { items = await API.get('/api/projects'); } catch (e) { list.innerHTML = ''; list.append(el('div', { class: 'hint', text: 'Couldn’t load projects: ' + e.message })); return; }
  list.innerHTML = '';
  if (!items.length) { list.append(el('div', { class: 'hint', style: { marginBottom: '10px' }, text: isOwner() ? 'No projects yet.' : 'You haven’t been added to any projects yet. Ask the owner to give you access.' })); return; }
  const box = el('div', { class: 'proj-list' });
  for (const it of items) {
    const isCur = P && it.id === P.id;
    const name = isCur ? P.name : it.name;
    box.append(el('div', { class: 'proj-item' + (isCur ? ' on' : ''), onclick: () => { m.close(); if (!isCur) openProject(it.id); } },
      el('span', { html: IC.doc, style: { width: '16px', color: '#6b7079' } }),
      el('div', { class: 'grow' }, el('div', { text: name, dir: 'auto', style: { fontWeight: 500 } }),
        el('div', { class: 'meta', text: `${it.nDocs || 0} documents · created ${new Date(it.created).toLocaleDateString()}${isOwner() ? '' : ' · ' + roleLabel(it.role)}` })),
      isOwner() ? el('button', { class: 'btn small', text: 'Members', onclick: e => { e.stopPropagation(); m.close(); membersModal(it.id, name); } }) : null,
      isCur && !UI.readOnly ? el('button', { class: 'icon-btn', title: 'Rename', html: IC.edit, onclick: async e => { e.stopPropagation(); m.close(); const n = await promptText('Rename project', 'Project name', P.name); if (n) { P.name = n; touch('meta'); render(); } } }) : null,
      isOwner() ? el('button', { class: 'icon-btn', title: 'Delete', html: IC.trash, onclick: async e => {
        e.stopPropagation(); m.close();
        if (!(await ask(`Delete “${name}” with all its documents and coding, for everyone? This can’t be undone.`))) return;
        try {
          if (isCur) { clearTimeout(saveTimer); saveTimer = null; pendingSave = false; dirty.text.clear(); }
          await API.del('/api/projects/' + it.id);
          if (isCur) { P = null; Sync.base = new Map(); joinRoom(); setStatus(''); }
          toast('Project deleted'); render();
        } catch (er) { toast('Couldn’t delete: ' + er.message, 'err'); }
      } }) : null));
  }
  list.append(box);
}
async function membersModal(pid, pname) {
  const body = el('div', {}, el('div', { class: 'hint', text: 'Loading…' }));
  modal({ title: 'Members — ' + pname, wide: true, body });
  let people2, members;
  try { [people2, members] = await Promise.all([API.get('/api/admin/overview'), API.get('/api/projects/' + pid + '/members')]); }
  catch (e) { body.innerHTML = ''; body.append(el('p', { text: 'Couldn’t load members: ' + e.message })); return; }
  const roles = new Map(members.map(x => [x.userId, x.role]));
  const users = people2.users.filter(u => u.status === 'active' && u.role !== 'owner');
  body.innerHTML = '';
  body.append(el('p', { class: 'hint', text: 'Owners can always open every project. Choose what each member can do in this one.' }));
  if (!users.length) { body.append(el('p', { text: 'No approved members yet. When people sign up, approve them in Admin first.' })); return; }
  const tbl = el('table', { class: 'mx' }, el('thead', {}, el('tr', {}, el('th', { class: 'n', text: 'Member' }), el('th', { text: 'Access to this project' }))));
  const tb = el('tbody');
  users.forEach(u => {
    const sel = el('select', { style: { width: 'auto' } }, [['', 'No access'], ['viewer', 'View only'], ['editor', 'Can code']].map(([v, l]) => el('option', { value: v, text: l, selected: (roles.get(u.id) || '') === v })));
    sel.addEventListener('change', async () => {
      try { await API.put('/api/projects/' + pid + '/members', { userId: u.id, role: sel.value || null }); toast('Access updated for ' + u.name); }
      catch (e) { toast('Couldn’t update: ' + e.message, 'err'); }
    });
    tb.append(el('tr', {}, el('td', { class: 'n', dir: 'auto', text: u.name }), el('td', {}, sel)));
  });
  tbl.append(tb);
  body.append(el('div', { class: 'tbl-wrap' }, tbl));
  body.append(el('div', { class: 'row', style: { margin: '12px 0 4px' } },
    el('button', { class: 'btn small', text: 'Give everyone “Can code”', onclick: async () => { for (const u of users) await API.put('/api/projects/' + pid + '/members', { userId: u.id, role: 'editor' }).catch(() => { }); toast('Everyone can now code'); $$('select', tbl).forEach(s => s.value = 'editor'); } }),
    el('button', { class: 'btn small', text: 'Give everyone “View only”', onclick: async () => { for (const u of users) await API.put('/api/projects/' + pid + '/members', { userId: u.id, role: 'viewer' }).catch(() => { }); toast('Everyone can now view'); $$('select', tbl).forEach(s => s.value = 'viewer'); } })));
}
async function exportProject() {
  if (!P) return;
  await ensureAllText();
  saveFile(safeName(P.name) + '.json', JSON.stringify(serialize(P), null, 1), 'text');
}
$('#jsonIn').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const o = JSON.parse(await f.text());
    if (o && o.kind === 'backup' && Array.isArray(o.projects)) {
      if (!(await ask(`This backup contains ${o.projects.length} projects. Import all of them as new projects?`, 'Import all', false))) return;
      for (const pr of o.projects) await openNewProject(deserialize(pr));
      return;
    }
    if (!o || !Array.isArray(o.docs) || !Array.isArray(o.codes)) throw new Error('this isn\u2019t a Thematic Coder project file');
    const p = deserialize(o); p.name = o.name || f.name.replace(/\.json$/i, '');
    await openNewProject(p);
  } catch (er) { toast('Import failed: ' + (er.message || er), 'err'); }
});

/* ============ user menu & account ============ */
function renderUserMenu() {
  const host = $('#userMenu'); host.innerHTML = '';
  const btn = el('button', { class: 'user-btn' }, avatar(ME.id, 26), el('span', { class: 'un', text: ME.name, dir: 'auto' }));
  btn.addEventListener('click', e => {
    e.stopPropagation(); const old = $('.menu', host); if (old) { old.remove(); return; }
    const menu = el('div', { class: 'menu' },
      el('div', { class: 'menu-head' }, el('b', { text: ME.name, dir: 'auto' }), el('small', { text: (isOwner() ? 'Owner' : 'Member') + (ME.email ? ' · ' + ME.email : '') })),
      isOwner() ? el('button', { onclick: () => { menu.remove(); closePop(); UI.tab = 'admin'; render(); updatePresence(); } }, 'Admin', el('small', { text: 'Approve sign-ups, manage access' })) : null,
      ME.google ? null : el('button', { onclick: () => { location.href = '/api/auth/google?link=1'; } }, 'Connect Google account', el('small', { text: 'Then sign in with Gmail instead of a password' })),
      el('button', { onclick: () => { menu.remove(); passwordModal(); } }, ME.hasPassword ? 'Change password' : 'Set a password', ME.hasPassword ? null : el('small', { text: 'Optional — you sign in with Google' })),
      el('button', { onclick: async () => { menu.remove(); await flushNow(); await API.post('/api/auth/logout').catch(() => { }); location.href = '/login'; } }, 'Log out'));
    host.append(menu);
    setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 0);
  });
  host.append(btn);
}
function passwordModal() {
  const cur = el('input', { type: 'password', autocomplete: 'current-password' });
  const needCur = ME.hasPassword;
  const nw = el('input', { type: 'password', autocomplete: 'new-password' });
  const nw2 = el('input', { type: 'password', autocomplete: 'new-password' });
  [cur, nw, nw2].forEach(i => i.classList.add('pw'));
  const m = modal({ title: 'Change password', body: el('div', {},
    needCur ? el('label', { class: 'field' }, el('span', { text: 'Current password' }), cur) : null,
    el('label', { class: 'field' }, el('span', { text: 'New password (at least 8 characters)' }), nw),
    el('label', { class: 'field' }, el('span', { text: 'Repeat new password' }), nw2)),
    actions: [el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }), el('button', { class: 'btn primary', text: 'Change password', onclick: async () => {
      if (nw.value !== nw2.value) { toast('The new passwords don’t match.', 'err'); return; }
      try { await API.post('/api/me/password', { current: cur.value, password: nw.value }); m.close(); ME.hasPassword = true; renderUserMenu(); toast(needCur ? 'Password changed. Other devices have been logged out.' : 'Password set. You can now log in with your name and password too.'); }
      catch (e) { toast(e.message, 'err'); }
    } })] });
  setTimeout(() => (needCur ? cur : nw).focus(), 40);
}

/* ============ ADMIN (owner) ============ */
let adminData = null;
function setAdminBadge(n) { const b = $('#adminBadge'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); } if (UI.tab === 'admin' && adminData && n !== adminData.users.filter(u => u.status === 'pending').length) renderAdminData(); }
async function refreshAdminBadge() {
  if (!isOwner()) return;
  try { adminData = await API.get('/api/admin/overview'); } catch (e) { return; }
  const n = adminData.users.filter(u => u.status === 'pending').length;
  const b = $('#adminBadge'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); }
}
function renderAdmin(m) {
  const page = el('div', { class: 'page' });
  page.append(el('div', { class: 'page-bar' }, el('h2', { text: 'Admin' }), el('span', { class: 'hint', text: 'Approve sign-ups, manage people, and choose who can access each project.' }), el('span', { class: 'sp' }),
    el('button', { class: 'btn', text: 'Download backup of all projects', onclick: backupAll })));
  page.append(el('div', { class: 'ov', id: 'adminBody' }, el('div', { class: 'hint', text: 'Loading…' })));
  m.append(page);
  renderAdminData();
}
async function backupAll() {
  try {
    toast('Preparing backup…');
    const list = await API.get('/api/projects'); const projects = [];
    for (const it of list) {
      const x = await API.get('/api/projects/' + it.id); const p = projectFromServer(x);
      for (const d of Object.values(p.docs)) { const t = await API.get('/api/projects/' + it.id + '/docs/' + d.id); d.paras = t.paras; d.loaded = true; }
      projects.push(serialize(p));
    }
    saveFile('thematic-coder-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'thematic-coder', kind: 'backup', exported: new Date().toISOString(), projects }, null, 1));
    toast('Backup downloaded (' + projects.length + ' projects). Restore any project with Projects → Import.');
  } catch (e) { toast('Backup failed: ' + e.message, 'err'); }
}
async function renderAdminData() {
  const host = $('#adminBody'); if (!host) return;
  try { adminData = await API.get('/api/admin/overview'); } catch (e) { host.innerHTML = ''; host.append(el('p', { text: 'Couldn’t load: ' + e.message })); return; }
  refreshAdminBadge();
  const top = host.scrollTop; host.innerHTML = '';
  const { users, projects, members, settings } = adminData;
  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); } catch (e) { toast(e.message, 'err'); } renderAdminData(); };
  const wrap = el('div', { class: 'admin' });
  // sign-ups
  const pending = users.filter(u => u.status === 'pending');
  const signupToggle = el('input', { type: 'checkbox' }); signupToggle.checked = settings.signupsOpen;
  signupToggle.addEventListener('change', () => act(() => API.patch('/api/admin/settings', { signupsOpen: signupToggle.checked }), signupToggle.checked ? 'Sign-ups are open' : 'Sign-ups are closed'));
  wrap.append(el('section', { class: 'card admin-sec' },
    el('div', { class: 'row' }, el('h3', { text: 'Waiting for approval' }), el('span', { class: 'sp', style: { flex: 1 } }), el('label', { class: 'chk' }, signupToggle, 'Allow new sign-ups')),
    el('p', { class: 'hint', text: 'Share this address so people can sign up: ' + location.origin + '/login' }),
    pending.length ? el('div', { class: 'proj-list' }, pending.map(u => el('div', { class: 'proj-item', style: { cursor: 'default' } },
      avatar(u.id, 28), el('div', { class: 'grow' }, el('div', { text: u.name, dir: 'auto', style: { fontWeight: 500 } }), el('div', { class: 'meta', text: (u.email ? u.email + ' · ' : '') + (u.google ? 'Google · ' : '') + 'signed up ' + new Date(u.created).toLocaleString() })),
      el('button', { class: 'btn small primary', text: 'Approve', onclick: () => act(() => API.patch('/api/admin/users/' + u.id, { status: 'active' }), u.name + ' approved') }),
      el('button', { class: 'btn small danger', text: 'Reject', onclick: async () => { if (await ask(`Reject and delete the sign-up from “${u.name}”?`, 'Reject')) act(() => API.del('/api/admin/users/' + u.id), 'Sign-up rejected'); } }))))
      : el('p', { class: 'hint', text: 'No one is waiting.' })));
  // access matrix
  const active = users.filter(u => u.status === 'active' && u.role !== 'owner');
  const role = new Map(members.map(x => [x.projectId + '|' + x.userId, x.role]));
  const sec = el('section', { class: 'card admin-sec' }, el('h3', { text: 'Project access' }),
    el('p', { class: 'hint', text: 'Choose what each approved member can do in each project. Owners can open everything.' }));
  if (!projects.length || !active.length) sec.append(el('p', { class: 'hint', text: !projects.length ? 'Create a project first.' : 'Approve some members first.' }));
  else {
    const tbl = el('table', { class: 'mx' });
    tbl.append(el('thead', {}, el('tr', {}, el('th', { class: 'n', text: 'Member' }), projects.map(p => el('th', { title: p.name, text: trunc(p.name, 24), dir: 'auto' })))));
    const tb = el('tbody');
    active.forEach(u => tb.append(el('tr', {}, el('td', { class: 'n', dir: 'auto', text: u.name }), projects.map(p => {
      const s = el('select', { class: 'acc' }, [['', '—'], ['viewer', 'View'], ['editor', 'Code']].map(([v, l]) => el('option', { value: v, text: l, selected: (role.get(p.id + '|' + u.id) || '') === v })));
      s.dataset.v = s.value;
      s.addEventListener('change', async () => { try { await API.put('/api/projects/' + p.id + '/members', { userId: u.id, role: s.value || null }); s.dataset.v = s.value; renderAdminData(); } catch (e) { toast(e.message, 'err'); s.value = s.dataset.v; } });
      return el('td', {}, s);
    }))));
    tbl.append(tb);
    // whole-column shortcuts
    tbl.append(el('tfoot', {}, el('tr', {}, el('td', { class: 'n', text: 'Everyone' }), projects.map(p => el('td', {},
      el('button', { class: 'link', text: 'Code', title: 'Give every member “Code” access', onclick: () => act(async () => { for (const u of active) await API.put('/api/projects/' + p.id + '/members', { userId: u.id, role: 'editor' }); }, 'Everyone can code in ' + p.name) }), ' · ',
      el('button', { class: 'link', text: 'None', title: 'Remove every member', onclick: () => act(async () => { for (const u of active) await API.put('/api/projects/' + p.id + '/members', { userId: u.id, role: null }); }, 'Access removed') }))))));
    sec.append(el('div', { class: 'tbl-wrap' }, tbl));
  }
  wrap.append(sec);
  // people
  const ptbl = el('table', { class: 'mx' }, el('thead', {}, el('tr', {}, el('th', { class: 'n', text: 'Name' }), el('th', { text: 'Role' }), el('th', { text: 'Status' }), el('th', { text: 'Projects' }), el('th', { text: '' }))));
  const ptb = el('tbody');
  users.filter(u => u.status !== 'pending').forEach(u => {
    const self = u.id === ME.id;
    const nProj = members.filter(x => x.userId === u.id).length;
    ptb.append(el('tr', {}, el('td', { class: 'n' }, el('div', { dir: 'auto', text: u.name + (self ? ' (you)' : '') }), u.email ? el('div', { class: 'hint', text: u.email + (u.google ? ' · Google' : '') }) : null),
      el('td', { text: u.role === 'owner' ? 'Owner' : 'Member' }),
      el('td', { text: u.status === 'active' ? 'Active' : 'Disabled' }),
      el('td', { class: 'c', text: u.role === 'owner' ? 'All' : nProj }),
      el('td', {}, self ? null : el('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        el('button', { class: 'btn small', text: u.role === 'owner' ? 'Make member' : 'Make owner', onclick: async () => { if (await ask(u.role === 'owner' ? `Remove owner rights from “${u.name}”?` : `Make “${u.name}” an owner? Owners can see every project and manage all accounts.`, 'Confirm', u.role === 'owner')) act(() => API.patch('/api/admin/users/' + u.id, { role: u.role === 'owner' ? 'member' : 'owner' })); } }),
        el('button', { class: 'btn small', text: 'Reset password', onclick: async () => { const pw = await promptText('Reset password for ' + u.name, 'New password (at least 8 characters) — tell it to them', '', 'Set password'); if (pw) act(() => API.post('/api/admin/users/' + u.id + '/password', { password: pw }), 'Password changed — they need to log in again'); } }),
        el('button', { class: 'btn small', text: u.status === 'active' ? 'Disable' : 'Enable', onclick: () => act(() => API.patch('/api/admin/users/' + u.id, { status: u.status === 'active' ? 'disabled' : 'active' })) }),
        el('button', { class: 'btn small danger', html: IC.trash, title: 'Delete account', onclick: async () => { if (await ask(`Delete the account “${u.name}”? Their coding stays in the projects.`)) act(() => API.del('/api/admin/users/' + u.id), 'Account deleted'); } })))));
  });
  ptbl.append(ptb);
  wrap.append(el('section', { class: 'card admin-sec' }, el('h3', { text: 'People' }), el('div', { class: 'tbl-wrap' }, ptbl)));
  host.append(wrap); host.scrollTop = top;
}

/* ============ CODE TAB ============ */
let codeLayoutEl = null;
function renderCode(m) {
  const lay = el('div', { class: 'code-layout' });
  codeLayoutEl = lay;
  const docsPane = el('aside', { class: 'pane docs-pane', id: 'docsPane' },
    el('div', { class: 'pane-head' }, el('h2', { text: 'Documents' }), el('span', { class: 'sp' }),
      el('button', { class: 'icon-btn', title: 'Paste text', html: IC.doc, onclick: pasteModal }),
      el('button', { class: 'btn small primary', html: IC.upload + ' Upload', onclick: () => $('#fileIn').click() })),
    el('div', { class: 'pane-body', id: 'docList' }));
  const docPane = el('section', { class: 'doc-pane' },
    el('div', { class: 'doc-toolbar', id: 'docBar' }),
    el('div', { class: 'doc-scroll', id: 'docScroll' }, el('div', { id: 'docHost' })));
  const codesPane = el('aside', { class: 'pane codes-pane', id: 'codesPane' },
    el('div', { class: 'pane-head' }, el('h2', { text: 'Codebook' }), el('span', { class: 'sp' }),
      el('button', { class: 'btn small', html: IC.plus + ' Code', onclick: () => codeModal(null) })),
    el('div', { class: 'cb-search' }, el('input', { type: 'search', id: 'cbSearch', placeholder: 'Filter codes…', dir: 'auto', oninput: renderCodebook })),
    el('div', { class: 'pane-body', id: 'codebook' }));
  lay.append(docsPane, docPane, codesPane);
  // drag-drop files
  lay.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); lay.classList.add('over'); } });
  lay.addEventListener('dragleave', e => { if (e.target === lay || !lay.contains(e.relatedTarget)) lay.classList.remove('over'); });
  lay.addEventListener('drop', e => { if (e.dataTransfer.files.length) { e.preventDefault(); lay.classList.remove('over'); handleFiles([...e.dataTransfer.files]); } });
  m.append(lay);
  renderDocList(); renderDocBar(); renderDoc(); renderCodebook();
}
function renderDocList() {
  const host = $('#docList'); if (!host) return; host.innerHTML = '';
  for (const d of docsInOrder()) {
    const th = d.paras.some(isTh);
    const here = projectPeers().filter(x => x.presence.doc === d.id);
    const hereIds = [...new Set(here.map(x => peerId(x) || x.peer))];
    host.append(el('div', { class: 'doc-item' + (d.id === UI.docId ? ' on' : ''), onclick: () => { UI.docId = d.id; UI.jump = -1; $('#docsPane').classList.remove('show'); renderDocList(); renderDocBar(); renderDoc(true); updatePresence(); } },
      el('span', { html: IC.doc, style: { width: '16px', color: '#6b7079', flex: 'none' } }),
      el('div', { class: 'grow' }, el('div', { class: 'nm', text: d.name, dir: 'auto' }), el('div', { class: 'meta', text: d.loaded === false ? 'Loading…' : `${d.paras.length} ¶ · ${d.segments.length} coded${th ? ' · ދިވެހި' : ''}` })),
      hereIds.length ? el('div', { class: 'doc-peers', title: hereIds.map(personName).join(', ') + ' here' }, hereIds.slice(0, 3).map(id => avatar(id, 18))) : null,
      el('div', { class: 'acts' },
        el('button', { class: 'icon-btn', title: 'Rename', html: IC.edit, onclick: async e => { e.stopPropagation(); if (ro()) return; const n = await promptText('Rename document', 'Document name', d.name); if (n) { d.name = n; touch('doc', d.id); renderDocList(); renderDocBar(); } } }),
        el('button', { class: 'icon-btn', title: 'Delete', html: IC.trash, onclick: async e => {
          e.stopPropagation(); if (ro()) return;
          if (!(await ask(`Remove “${d.name}” and its ${d.segments.length} coded segments from the project?`, 'Remove'))) return;
          delete P.docs[d.id]; P.docOrder = P.docOrder.filter(x => x !== d.id); dirty.docs.delete(d.id); dirty.text.delete(d.id);
          if (UI.docId === d.id) UI.docId = docsInOrder()[0] ? docsInOrder()[0].id : null;
          touch('meta'); render(); updatePresence();
        } }))));
  }
  host.append(el('div', { class: 'drop-hint', text: 'Drop .docx or .txt files here' }));
}
function renderDocBar() {
  const bar = $('#docBar'); if (!bar) return; bar.innerHTML = '';
  const d = curDoc();
  bar.append(el('button', { class: 'icon-btn mob-only', title: 'Documents', html: IC.menu, onclick: () => { $('#codesPane').classList.remove('show'); $('#docsPane').classList.toggle('show'); } }));
  bar.append(el('div', { class: 'title', text: d ? d.name : 'No document', dir: 'auto' }));
  if (UI.focus && codeById(UI.focus)) {
    const c = codeById(UI.focus);
    const n = d ? d.segments.filter(s => s.c.includes(c.id)).length : 0;
    bar.append(el('div', { class: 'focus-chip' }, el('span', { class: 'sw', style: { background: c.color } }), el('span', { text: trunc(c.name, 28), dir: 'auto' }), el('span', { class: 'hint', text: `${n} here` }),
      el('button', { class: 'icon-btn', title: 'Previous', html: IC.up, onclick: () => jumpFocus(-1) }),
      el('button', { class: 'icon-btn', title: 'Next', html: IC.down, onclick: () => jumpFocus(1) }),
      el('button', { class: 'icon-btn', title: 'Show all codes', html: IC.x, onclick: () => { UI.focus = null; renderDocBar(); renderDoc(); renderCodebook(); } })));
  }
  bar.append(el('span', { class: 'sp' }));
  bar.append(el('span', { class: 'hint', text: d ? 'Select text to code · click a highlight to edit' : '' }));
  bar.append(el('button', { class: 'icon-btn', title: 'Smaller text', text: 'A−', onclick: () => setDocSize(-1) }));
  bar.append(el('button', { class: 'icon-btn', title: 'Larger text', text: 'A+', onclick: () => setDocSize(1) }));
  bar.append(el('button', { class: 'btn small mob-only', html: IC.tag + ' Codes', onclick: () => { $('#docsPane').classList.remove('show'); $('#codesPane').classList.toggle('show'); } }));
}
function setDocSize(dlt) { UI.docSize = Math.max(12, Math.min(22, UI.docSize + dlt)); lsSet('tc:docSize', UI.docSize); const b = $('.doc-body'); b && b.style.setProperty('--docsize', UI.docSize + 'px'); }
function jumpFocus(dir) {
  const spans = $$('.doc-body .hl'); if (!spans.length) return;
  // unique by first seg start
  UI.jump = (UI.jump + dir + spans.length) % spans.length;
  const s = spans[UI.jump]; s.scrollIntoView({ block: 'center', behavior: 'smooth' });
  s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash');
}
function emptyDocArea() {
  const zone = el('div', { class: 'big-drop' },
    el('div', { style: { fontWeight: 600, color: '#1c1e22', marginBottom: '6px' }, text: 'Drop Word (.docx) or text (.txt) transcripts here' }),
    el('div', { text: 'Dhivehi (Thaana) and English are both supported, including mixed documents.' }),
    el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
      el('button', { class: 'btn primary', html: IC.upload + ' Choose files', onclick: () => $('#fileIn').click() }),
      el('button', { class: 'btn', text: 'Paste text instead', onclick: pasteModal })));
  return el('div', { class: 'empty' }, el('h3', { text: 'Add your first transcript' }), zone);
}
function renderDoc(resetScroll) {
  const host = $('#docHost'); if (!host) return;
  const scroller = $('#docScroll'); const top = resetScroll ? 0 : scroller.scrollTop;
  host.innerHTML = '';
  const d = curDoc();
  if (!d) { host.append(UI.readOnly ? el('div', { class: 'empty' }, el('h3', { text: 'No documents yet' })) : emptyDocArea()); return; }
  if (d.loaded === false) { host.append(el('div', { class: 'empty' }, el('h3', { text: 'Loading transcript…' }))); return; }
  const { starts } = fullText(d);
  let segs = d.segments.slice();
  if (UI.focus) segs = segs.filter(s => s.c.includes(UI.focus));
  if (UI.pending && UI.pending.docId === d.id) segs.push({ id: '_pending', s: UI.pending.s, e: UI.pending.e, c: [], pending: true });
  const L = fullText(d).text.length;
  projectPeers().forEach(x => { const pr = x.presence; if (pr.doc === d.id && Array.isArray(pr.sel) && pr.sel.length === 2) { const s0 = Math.max(0, Math.min(L, +pr.sel[0] || 0)), e0 = Math.max(0, Math.min(L, +pr.sel[1] || 0)); if (e0 > s0) { const id = peerId(x); segs.push({ id: '_peer', s: s0, e: e0, c: [], peer: personColor(id), who: personName(id) }); } } });
  segs.sort((a, b) => a.s - b.s || b.e - a.e);
  const body = el('div', { class: 'doc-body', style: { '--docsize': UI.docSize + 'px' } });
  body.style.setProperty('--docsize', UI.docSize + 'px');
  let si = 0; // segments sorted by start; for each para gather overlapping
  const active = [];
  for (let i = 0; i < d.paras.length; i++) {
    const text = d.paras[i], ps = starts[i], pe = ps + text.length;
    // add segments starting before pe
    while (si < segs.length && segs[si].s < pe + 1) { active.push(segs[si]); si++; }
    for (let k = active.length - 1; k >= 0; k--) if (active[k].e <= ps) active.splice(k, 1);
    const over = active.filter(s => s.s < pe && s.e > ps);
    const pt = el('p', { class: 'ptext' + (isTh(text) ? ' tx' : ''), dir: 'auto', 'data-start': ps, 'data-len': text.length });
    if (!over.length) pt.textContent = text;
    else {
      const bounds = new Set([ps, pe]);
      over.forEach(s => { bounds.add(Math.max(ps, s.s)); bounds.add(Math.min(pe, s.e)); });
      const b = [...bounds].sort((x, y) => x - y);
      for (let j = 0; j < b.length - 1; j++) {
        const a = b[j], z = b[j + 1]; if (z <= a) continue;
        const piece = text.slice(a - ps, z - ps);
        const cover = over.filter(s => s.s <= a && s.e >= z);
        if (!cover.length) { pt.append(document.createTextNode(piece)); continue; }
        const real = cover.filter(s => !s.pending && !s.peer);
        const span = el('span', { class: 'hl', 'data-segs': real.map(s => s.id).join(',') }, piece);
        if (cover.some(s => s.pending)) span.classList.add('pending');
        const pr = cover.find(s => s.peer);
        if (pr) { span.classList.add('peersel'); span.style.outlineColor = pr.peer; span.title = pr.who + ' is selecting this'; if (!real.length) span.style.background = rgba(pr.peer.startsWith('#') ? pr.peer : '#6b7079', .14); }
        const cols = [];
        cover.forEach(s => s.c.forEach(cid => { if (UI.focus && cid !== UI.focus) return; const c = codeById(cid); if (c && !cols.includes(c.color)) cols.push(c.color); }));
        if (cols.length === 1) { span.style.background = rgba(cols[0], .24); span.style.boxShadow = `inset 0 -2px 0 ${cols[0]}`; }
        else if (cols.length > 1) {
          const w = 7; const stops = cols.map((c, k) => `${rgba(c, .26)} ${k * w}px ${(k + 1) * w}px`).join(',');
          span.style.background = `repeating-linear-gradient(135deg,${stops})`; span.style.boxShadow = `inset 0 -2px 0 ${cols[0]}`;
        }
        pt.append(span);
      }
    }
    // margin chips: codes of segments starting in this paragraph
    const startHere = d.segments.filter(s => s.s >= ps && s.s <= pe && (!UI.focus || s.c.includes(UI.focus)));
    const mcodes = []; startHere.forEach(s => s.c.forEach(c => { if (!mcodes.includes(c)) mcodes.push(c); }));
    const margin = el('div', { class: 'pmargin' }, mcodes.map(cid => { const c = codeById(cid); if (!c) return null; return el('div', { class: 'mchip', style: { borderLeftColor: c.color }, title: c.name, text: c.name, dir: 'auto', onclick: () => { UI.focus = UI.focus === c.id ? null : c.id; UI.jump = -1; renderDocBar(); renderDoc(); renderCodebook(); } }); }));
    body.append(el('div', { class: 'prow' }, el('div', { class: 'pnum', text: i + 1 }), pt, margin));
  }
  host.append(body);
  scroller.scrollTop = top;
  body.addEventListener('mouseup', onDocMouseUp);
  body.addEventListener('click', onDocClick);
}

/* selection → offsets */
function pointOffset(body, node, off) {
  const texts = $$('.ptext', body);
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]; const r = document.createRange(); r.selectNodeContents(t);
    let cmp; try { cmp = r.comparePoint(node, off); } catch (e) { continue; }
    if (cmp === 1) return +t.dataset.start + +t.dataset.len;
    if (cmp === 0) { const r2 = document.createRange(); r2.selectNodeContents(t); r2.setEnd(node, off); return +t.dataset.start + r2.toString().length; }
  }
  return 0;
}
function selectionRange() {
  const sel = getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0); const body = $('.doc-body'); if (!body || !body.contains(r.commonAncestorContainer)) return null;
  const d = curDoc(); if (!d) return null;
  let s = pointOffset(body, r.startContainer, r.startOffset), e = pointOffset(body, r.endContainer, r.endOffset);
  if (e < s) [s, e] = [e, s];
  const t = fullText(d).text;
  while (s < e && /\s/.test(t[s])) s++;
  while (e > s && /\s/.test(t[e - 1])) e--;
  if (e - s < 1) return null;
  return { docId: d.id, s, e, rect: r.getBoundingClientRect() };
}
let suppressClick = false;
function onDocMouseUp(ev) {
  if (ev.pointerType === 'touch') return;
  setTimeout(() => {
    const r = selectionRange(); if (!r) return;
    suppressClick = true; setTimeout(() => suppressClick = false, 50);
    hideFab(); openCodePop(r);
  }, 0);
}
function onDocClick(ev) {
  if (suppressClick) return;
  const sel = getSelection(); if (sel && !sel.isCollapsed) return;
  const span = ev.target.closest('.hl'); if (!span || !span.dataset.segs) return;
  openSegPop(span.dataset.segs.split(',').filter(Boolean), span.getBoundingClientRect());
}
// touch / keyboard selection: floating button
let selTimer = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    if (!$('#pop').classList.contains('hidden')) return;
    const r = selectionRange(); const fab = $('#codeFab');
    if (!r) { hideFab(); return; }
    fab.classList.remove('hidden');
    const x = Math.min(window.innerWidth - 150, Math.max(8, r.rect.left + r.rect.width / 2 - 65));
    let y = r.rect.bottom + 10; if (y > window.innerHeight - 50) y = r.rect.top - 44;
    fab.style.left = x + 'px'; fab.style.top = y + 'px';
  }, 350);
});
function hideFab() { $('#codeFab').classList.add('hidden'); }
$('#codeFab').addEventListener('mousedown', e => e.preventDefault());
$('#codeFab').addEventListener('click', () => { const r = selectionRange(); hideFab(); if (r) openCodePop(r); });

/* popover */
let popState = null;
function closePop(silent) {
  const pop = $('#pop'); if (pop.classList.contains('hidden') && !UI.pending) return;
  pop.classList.add('hidden'); pop.innerHTML = '';
  const had = !!UI.pending; UI.pending = null; popState = null;
  if (had) updatePresence();
  if ((had || UI.docStale) && !silent) { UI.docStale = false; renderDoc(); }
}
function placePop(rect) {
  const pop = $('#pop'); pop.classList.remove('hidden');
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = rect.left + rect.width / 2 - w / 2; x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  let y = rect.bottom + 8; if (y + h > window.innerHeight - 8) y = Math.max(8, rect.top - h - 8);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
document.addEventListener('mousedown', e => {
  const pop = $('#pop');
  if (pop.classList.contains('hidden')) return;
  if (pop.contains(e.target) || e.target.closest('.modal-back')) return;
  closePop();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalStack.length) { modalStack[modalStack.length - 1].close(); return; }
    if (!$('#pop').classList.contains('hidden')) closePop();
    $('.menu') && $('.menu').remove();
  }
});
function segForRange(d, r) { return d.segments.find(s => s.s === r.s && s.e === r.e); }
function toggleCodeOnRange(codeId, r) {
  const d = P.docs[r.docId]; if (!d) return;
  let seg = segForRange(d, r);
  if (seg && seg.c.includes(codeId)) { seg.c = seg.c.filter(x => x !== codeId); if (!seg.c.length) d.segments = d.segments.filter(x => x !== seg); }
  else if (seg) seg.c.push(codeId);
  else { seg = { id: 's' + uid(), s: r.s, e: r.e, c: [codeId], m: '', by: Store.uid || null, at: Date.now() }; d.segments.push(seg); }
  UI.recent[codeId] = Date.now();
  touch('doc', d.id);
}
function createCode(name) {
  const c = { id: 'c' + uid(), name: name.trim(), color: nextColor(P.codes), desc: '', theme: null, at: Date.now() };
  P.codes.push(c); touch('meta'); return c;
}
function openCodePop(r) {
  if (ro()) return;
  const d = P.docs[r.docId]; if (!d) return;
  UI.pending = { docId: r.docId, s: r.s, e: r.e }; updatePresence();
  renderDoc();
  getSelection().removeAllRanges();
  const pop = $('#pop'); pop.innerHTML = '';
  const excerpt = fullText(d).text.slice(r.s, r.e);
  const input = el('input', { type: 'text', placeholder: 'Find or create a code…', dir: 'auto', autocomplete: 'off' });
  const listEl = el('div', { class: 'pop-list' });
  popState = { mode: 'code', r, act: 0, items: [] };
  const draw = () => {
    const q = input.value.trim(); const ql = q.toLowerCase();
    const seg = segForRange(d, r); const on = new Set(seg ? seg.c : []);
    let codes = P.codes.filter(c => !ql || c.name.toLowerCase().includes(ql));
    codes.sort((a, b) => (UI.recent[b.id] || 0) - (UI.recent[a.id] || 0) || a.name.localeCompare(b.name));
    const items = [];
    const exact = P.codes.find(c => c.name.toLowerCase() === ql);
    if (q && !exact) items.push({ create: q });
    codes.forEach(c => items.push({ code: c }));
    popState.items = items; if (popState.act >= items.length) popState.act = Math.max(0, items.length - 1);
    listEl.innerHTML = '';
    if (!items.length) listEl.append(el('div', { class: 'hint', style: { padding: '8px' }, text: 'No codes yet — type a name and press Enter.' }));
    items.forEach((it, i) => {
      const row = it.create
        ? el('div', { class: 'pop-item create' + (i === popState.act ? ' act' : '') }, el('span', { html: IC.plus, style: { width: '18px', display: 'grid', placeItems: 'center' } }), el('span', { class: 'nm', dir: 'auto' }, 'Create “', it.create, '”'))
        : el('div', { class: 'pop-item' + (on.has(it.code.id) ? ' on' : '') + (i === popState.act ? ' act' : '') },
          el('span', { class: 'ck', html: on.has(it.code.id) ? IC.check : '' }),
          el('span', { class: 'sw', style: { background: it.code.color } }),
          el('span', { class: 'nm', text: it.code.name, dir: 'auto' }),
          themePath(it.code).top ? el('span', { class: 'th', text: themePath(it.code).top.name, dir: 'auto' }) : null);
      row.addEventListener('mousedown', e => e.preventDefault());
      row.addEventListener('click', () => choose(it));
      row.addEventListener('mousemove', () => { if (popState.act !== i) { popState.act = i; $$('.pop-item', listEl).forEach((x, k) => x.classList.toggle('act', k === i)); } });
      listEl.append(row);
    });
  };
  const choose = it => {
    if (it.create) { const c = createCode(it.create); toggleCodeOnRange(c.id, r); input.value = ''; }
    else toggleCodeOnRange(it.code.id, r);
    popState.act = 0; draw(); renderDoc(); renderCodebook(); renderDocList(); input.focus();
  };
  input.addEventListener('input', () => { popState.act = 0; draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); popState.act = Math.min(popState.items.length - 1, popState.act + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); popState.act = Math.max(0, popState.act - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = popState.items[popState.act]; if (it) choose(it); else if (!input.value.trim()) closePop(); }
  });
  pop.append(
    el('div', { class: 'pop-sel' }, el('b', { text: 'Selected text' }), el('div', { dir: 'auto', text: trunc(excerpt, 220) })),
    el('div', { class: 'pop-in' }, input), listEl,
    el('div', { class: 'pop-foot' }, el('span', { text: 'Click codes to toggle · Enter adds' }), el('span', { class: 'sp' }), el('button', { class: 'btn small primary', text: 'Done', onclick: () => closePop() })));
  draw();
  placePop(r.rect);
  setTimeout(() => input.focus(), 10);
}
function openSegPop(ids, rect) {
  const d = curDoc(); if (!d) return;
  const pop = $('#pop'); pop.innerHTML = '';
  popState = { mode: 'seg' };
  resolvePeople(ids.map(id => (d.segments.find(s => s.id === id) || {}).by));
  const draw = () => {
    pop.innerHTML = '';
    const segs = ids.map(id => d.segments.find(s => s.id === id)).filter(Boolean);
    if (!segs.length) { closePop(); return; }
    const wrap = el('div', { class: 'pop-list', style: { padding: '0' } });
    segs.forEach(seg => {
      const memo = el('textarea', { placeholder: UI.readOnly ? 'No memo' : 'Memo / analytic note…', dir: 'auto', readonly: UI.readOnly }); memo.value = seg.m || '';
      let mt; memo.addEventListener('input', () => { clearTimeout(mt); mt = setTimeout(() => { seg.m = memo.value; touch('doc', d.id); }, 400); });
      wrap.append(el('div', { class: 'seg-card' },
        el('div', { class: 'q', dir: 'auto', text: segText(d, seg) }),
        el('div', { class: 'chips' }, seg.c.map(cid => { const c = codeById(cid); if (!c) return null; return el('span', { class: 'chip', style: { borderColor: c.color, background: rgba(c.color, .08) } }, el('span', { class: 'sw-inline', style: { background: c.color, margin: 0 } }), el('span', { class: 'nm', text: c.name, dir: 'auto' }), UI.readOnly ? null : el('button', { title: 'Remove this code', html: '×', onclick: () => { seg.c = seg.c.filter(x => x !== cid); if (!seg.c.length) d.segments = d.segments.filter(x => x !== seg); touch('doc', d.id); renderDoc(); renderCodebook(); renderDocList(); draw(); } })); }),
          UI.readOnly ? null : el('button', { class: 'btn small ghost', html: IC.plus + ' Add code', onclick: () => { closePop(true); openCodePop({ docId: d.id, s: seg.s, e: seg.e, rect }); } })),
        memo,
        el('div', { class: 'row', style: { marginTop: '6px', justifyContent: 'space-between' } },
          el('span', { class: 'hint', text: '¶ ' + (paraIndexAt(d, seg.s) + 1) + (seg.by ? ' · coded by ' + personName(seg.by) : '') }),
          UI.readOnly ? null : el('button', { class: 'btn small danger', html: IC.trash + ' Remove segment', onclick: () => { d.segments = d.segments.filter(x => x !== seg); touch('doc', d.id); renderDoc(); renderCodebook(); renderDocList(); draw(); } }))));
    });
    pop.append(el('div', { class: 'pop-sel' }, el('b', { text: segs.length > 1 ? segs.length + ' overlapping segments' : 'Coded segment' })), wrap,
      el('div', { class: 'pop-foot' }, el('span', { class: 'sp' }), el('button', { class: 'btn small primary', text: 'Done', onclick: () => closePop() })));
  };
  draw(); placePop(rect);
}

/* codebook */
function renderCodebook() {
  const host = $('#codebook'); if (!host) return; host.innerHTML = '';
  const q = ($('#cbSearch') || {}).value ? $('#cbSearch').value.trim().toLowerCase() : '';
  const { cnt } = stats();
  const match = c => !q || c.name.toLowerCase().includes(q);
  const row = (c, indent) => el('div', { class: 'code-row' + (UI.focus === c.id ? ' on' : '') + (indent ? ' indent' : ''), title: c.desc || c.name, onclick: () => { UI.focus = UI.focus === c.id ? null : c.id; UI.jump = -1; renderDocBar(); renderDoc(); renderCodebook(); } },
    el('span', { class: 'sw', style: { background: c.color } }), el('span', { class: 'nm', text: c.name, dir: 'auto' }), el('span', { class: 'ct', text: cnt.get(c.id) || 0 }),
    el('button', { class: 'icon-btn', title: 'Edit code', html: IC.edit, onclick: e => { e.stopPropagation(); codeModal(c); } }));
  if (!P.codes.length) { host.append(el('div', { class: 'hint', style: { padding: '8px 6px' }, text: 'No codes yet. Select text in a document and type a code name, or add codes here first.' })); return; }
  let any = false;
  for (const t of topThemes()) {
    const direct = P.codes.filter(c => c.theme === t.id && match(c));
    const subs = subThemes(t.id).map(s => ({ s, codes: P.codes.filter(c => c.theme === s.id && match(c)) })).filter(x => x.codes.length);
    if (!direct.length && !subs.length) continue; any = true;
    host.append(el('div', { class: 'cb-group' }, el('span', { class: 'bar', style: { background: t.color } }), el('span', { text: t.name, dir: 'auto' })));
    direct.forEach(c => host.append(row(c)));
    subs.forEach(({ s, codes }) => { host.append(el('div', { class: 'cb-group cbsub' }, el('span', { text: '↳ ' + s.name, dir: 'auto' }))); codes.forEach(c => host.append(row(c, true))); });
  }
  const un = P.codes.filter(c => !(c.theme && themeById(c.theme)) && match(c));
  if (un.length) { any = true; if (P.themes.length) host.append(el('div', { class: 'cb-group' }, el('span', { class: 'bar', style: { background: '#d3d0c8' } }), 'Not in a theme')); un.forEach(c => host.append(row(c))); }
  if (!any) host.append(el('div', { class: 'hint', style: { padding: '8px 6px' }, text: 'No codes match.' }));
}

/* code / theme modals */
function swatchPicker(cur, onPick) {
  const wrap = el('div', { class: 'swatches' });
  const ci = el('input', { type: 'color', value: cur, title: 'Custom colour' });
  const draw = v => { $$('.swatch', wrap).forEach(s => s.classList.toggle('on', s.dataset.c === v)); };
  PALETTE.forEach(c => wrap.append(el('span', { class: 'swatch', 'data-c': c, style: { background: c }, onclick: () => { onPick(c); ci.value = c; draw(c); } })));
  ci.addEventListener('input', () => { onPick(ci.value); draw(ci.value); });
  wrap.append(ci); draw(cur); return wrap;
}
function themeOptions(sel, allowNone, excludeId, topOnly) {
  const s = el('select');
  if (allowNone) s.append(el('option', { value: '', text: allowNone }));
  for (const t of topThemes()) {
    if (t.id === excludeId) continue;
    s.append(el('option', { value: t.id, text: t.name, selected: sel === t.id }));
    if (!topOnly) for (const st of subThemes(t.id)) if (st.id !== excludeId) s.append(el('option', { value: st.id, text: '   ↳ ' + st.name, selected: sel === st.id }));
  }
  return s;
}
function codeModal(code, presetTheme) {
  if (ro()) return;
  const isNew = !code;
  const c = code ? { ...code } : { id: 'c' + uid(), name: '', color: nextColor(P.codes), desc: '', theme: presetTheme || null, at: Date.now() };
  const name = el('input', { type: 'text', value: c.name, dir: 'auto', placeholder: 'e.g. Poor connectivity' });
  const desc = el('textarea', { dir: 'auto', placeholder: 'Definition: when to apply this code…' }); desc.value = c.desc || '';
  const theme = themeOptions(c.theme, '— Not in a theme —');
  const { cnt } = stats();
  const merge = el('select'); merge.append(el('option', { value: '', text: '— Don’t merge —' }));
  P.codes.filter(x => x.id !== c.id).forEach(x => merge.append(el('option', { value: x.id, text: x.name })));
  const save = () => {
    const n = name.value.trim(); if (!n) { toast('Give the code a name.', 'err'); return; }
    if (P.codes.some(x => x.id !== c.id && x.name.toLowerCase() === n.toLowerCase())) { toast('A code with that name already exists.', 'err'); return; }
    c.name = n; c.desc = desc.value.trim(); c.theme = theme.value || null;
    if (isNew) P.codes.push(c); else Object.assign(code, c);
    if (!isNew && merge.value) mergeCode(code.id, merge.value);
    touch('meta'); m.close(); refreshViews();
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  const m = modal({ title: isNew ? 'New code' : 'Edit code', body: el('div', {},
    el('label', { class: 'field' }, el('span', { text: 'Code name' }), name),
    el('label', { class: 'field' }, el('span', { text: 'Description' }), desc),
    el('div', { class: 'field' }, el('span', { text: 'Colour', style: { display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' } }), swatchPicker(c.color, v => c.color = v)),
    el('label', { class: 'field' }, el('span', { text: 'Theme' }), theme),
    isNew ? null : el('label', { class: 'field' }, el('span', { text: `Merge into another code (${cnt.get(c.id) || 0} segments move over)` }), merge)),
    actions: [
      isNew ? null : el('button', { class: 'btn danger left', html: IC.trash + ' Delete', onclick: async () => {
        m.close();
        if (await ask(`Delete the code “${code.name}”? It will be removed from ${cnt.get(code.id) || 0} coded segments.`)) { deleteCode(code.id); refreshViews(); }
      } }),
      el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }),
      el('button', { class: 'btn primary', text: isNew ? 'Create code' : 'Save', onclick: save })].filter(Boolean) });
}
function mergeCode(fromId, toId) {
  for (const d of docsInOrder()) {
    let ch = false;
    for (const s of d.segments) if (s.c.includes(fromId)) { s.c = [...new Set(s.c.map(x => x === fromId ? toId : x))]; ch = true; }
    if (ch) touch('doc', d.id);
  }
  P.codes = P.codes.filter(c => c.id !== fromId);
  if (UI.focus === fromId) UI.focus = toId;
  touch('meta');
}
function deleteCode(id) {
  for (const d of docsInOrder()) {
    const before = d.segments.length; let ch = false;
    d.segments.forEach(s => { if (s.c.includes(id)) { s.c = s.c.filter(x => x !== id); ch = true; } });
    d.segments = d.segments.filter(s => s.c.length);
    if (ch || before !== d.segments.length) touch('doc', d.id);
  }
  P.codes = P.codes.filter(c => c.id !== id);
  if (UI.focus === id) UI.focus = null;
  touch('meta');
}
function themeModal(theme, parentPreset) {
  if (ro()) return;
  const isNew = !theme;
  const t = theme ? { ...theme } : { id: 't' + uid(), name: '', color: nextColor(P.themes), desc: '', parent: parentPreset || null, order: Math.max(0, ...P.themes.map(x => x.order || 0)) + 1 };
  if (isNew && parentPreset) { const p = themeById(parentPreset); if (p) t.color = p.color; }
  const name = el('input', { type: 'text', value: t.name, dir: 'auto', placeholder: 'e.g. Barriers to online teaching' });
  const desc = el('textarea', { dir: 'auto', placeholder: 'What this theme captures…' }); desc.value = t.desc || '';
  const hasKids = !isNew && subThemes(t.id).length > 0;
  const parent = themeOptions(t.parent, '— Top-level theme —', t.id, true);
  if (hasKids) parent.disabled = true;
  const save = () => {
    const n = name.value.trim(); if (!n) { toast('Give the theme a name.', 'err'); return; }
    t.name = n; t.desc = desc.value.trim(); t.parent = hasKids ? null : (parent.value || null);
    if (isNew) P.themes.push(t); else Object.assign(theme, t);
    touch('meta'); m.close(); refreshViews();
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  const m = modal({ title: isNew ? (t.parent ? 'New sub-theme' : 'New theme') : 'Edit theme', body: el('div', {},
    el('label', { class: 'field' }, el('span', { text: 'Theme name' }), name),
    el('label', { class: 'field' }, el('span', { text: 'Description' }), desc),
    el('div', { class: 'field' }, el('span', { text: 'Colour', style: { display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' } }), swatchPicker(t.color, v => t.color = v)),
    el('label', { class: 'field' }, el('span', { text: hasKids ? 'Placement (has sub-themes, so it stays top-level)' : 'Place under (makes this a sub-theme)' }), parent)),
    actions: [
      isNew ? null : el('button', { class: 'btn danger left', html: IC.trash + ' Delete', onclick: async () => {
        m.close();
        if (await ask(`Delete the theme “${theme.name}”? Its codes are kept and moved ${theme.parent ? 'to the parent theme' : 'to “Unassigned”'}${hasKids ? '; its sub-themes become top-level themes' : ''}.`)) {
          P.codes.forEach(c => { if (c.theme === theme.id) c.theme = theme.parent || null; });
          P.themes.forEach(x => { if (x.parent === theme.id) x.parent = null; });
          P.themes = P.themes.filter(x => x.id !== theme.id); touch('meta'); refreshViews();
        }
      } }),
      el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }),
      el('button', { class: 'btn primary', text: isNew ? 'Create' : 'Save', onclick: save })].filter(Boolean) });
}
function refreshViews() {
  if (UI.tab === 'code' && $('#codebook')) { renderDocBar(); renderDoc(); renderCodebook(); renderDocList(); }
  else render();
}

/* ============ THEMES TAB ============ */
function renderThemes(m) {
  const { cnt } = stats();
  const page = el('div', { class: 'page' });
  page.append(el('div', { class: 'page-bar' },
    el('h2', { text: 'Organise codes into themes' }),
    el('span', { class: 'hint', text: 'Drag code cards between columns. Drop on a sub-theme box to file a code there.' }),
    el('span', { class: 'sp' }),
    el('button', { class: 'btn', html: IC.plus + ' Code', onclick: () => codeModal(null) }),
    el('button', { class: 'btn primary', html: IC.plus + ' Theme', onclick: () => themeModal(null) })));
  const board = el('div', { class: 'board' });
  const chip = c => {
    const ch = el('div', { class: 'cchip', draggable: 'true', style: { '--c': c.color }, title: c.desc || 'Drag to a theme · click to edit', onclick: () => codeModal(c) },
      el('span', { class: 'nm', text: c.name, dir: 'auto' }), el('span', { class: 'ct', text: cnt.get(c.id) || 0 }));
    ch.style.setProperty('--c', c.color);
    ch.addEventListener('dragstart', e => { dragging = true; e.dataTransfer.setData('text/plain', 'code:' + c.id); e.dataTransfer.effectAllowed = 'move'; ch.classList.add('dragging'); });
    ch.addEventListener('dragend', () => { ch.classList.remove('dragging'); dragging = false; if (UI.viewStale) { UI.viewStale = false; setTimeout(refreshAfterRemote, 50); } });
    if (UI.readOnly) ch.draggable = false;
    return ch;
  };
  const zone = (themeId, codes, ph) => {
    const z = el('div', { class: 'zone' }, codes.length ? codes.map(chip) : el('div', { class: 'ph', text: ph }));
    z.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); z.classList.add('over'); });
    z.addEventListener('dragleave', e => { if (!z.contains(e.relatedTarget)) z.classList.remove('over'); });
    z.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation(); z.classList.remove('over');
      dragging = false; if (ro()) return;
      const v = e.dataTransfer.getData('text/plain'); if (!v.startsWith('code:')) return;
      const c = codeById(v.slice(5)); if (!c || c.theme === themeId) return;
      c.theme = themeId; touch('meta'); render();
    });
    return z;
  };
  const byCount = (a, b) => (cnt.get(b.id) || 0) - (cnt.get(a.id) || 0);
  const un = P.codes.filter(c => !(c.theme && themeById(c.theme))).sort(byCount);
  board.append(el('div', { class: 'col unassigned' },
    el('div', { class: 'col-head' }, el('div', { class: 't' }, el('b', { text: 'Unassigned codes' })), el('div', { class: 'm', text: `${un.length} codes` })),
    el('div', { class: 'col-body' }, zone(null, un, P.codes.length ? 'All codes are in themes 🎉' : 'Codes you create while coding appear here.'))));
  const tops = topThemes();
  tops.forEach((t, ti) => {
    const direct = P.codes.filter(c => c.theme === t.id).sort(byCount);
    const subs = subThemes(t.id);
    const allIds = [t.id, ...subs.map(s => s.id)];
    const nCodes = P.codes.filter(c => allIds.includes(c.theme)).length;
    const col = el('div', { class: 'col', style: { '--c': t.color } },
      el('div', { class: 'col-head' },
        el('div', { class: 't' }, el('b', { text: t.name, dir: 'auto' }),
          ti > 0 ? el('button', { class: 'icon-btn', title: 'Move left', html: IC.left, onclick: () => moveTheme(t, -1) }) : null,
          ti < tops.length - 1 ? el('button', { class: 'icon-btn', title: 'Move right', html: IC.right, onclick: () => moveTheme(t, 1) }) : null,
          el('button', { class: 'icon-btn', title: 'Edit theme', html: IC.edit, onclick: () => themeModal(t) })),
        t.desc ? el('div', { class: 'd', text: t.desc, dir: 'auto' }) : null,
        el('div', { class: 'm', text: `${nCodes} codes${subs.length ? ' · ' + subs.length + ' sub-themes' : ''}` })),
      el('div', { class: 'col-body' },
        zone(t.id, direct, 'Drop codes here'),
        subs.map(s => el('div', { class: 'sub', style: { '--c': s.color } },
          el('div', { class: 'sub-head' }, el('span', { class: 'bar' }), el('b', { text: s.name, dir: 'auto' }), el('button', { class: 'icon-btn', title: 'Edit sub-theme', html: IC.edit, onclick: () => themeModal(s) })),
          s.desc ? el('div', { class: 'hint', style: { padding: '0 10px' }, text: s.desc, dir: 'auto' }) : null,
          zone(s.id, P.codes.filter(c => c.theme === s.id).sort(byCount), 'Drop codes here'))),
        el('button', { class: 'btn small ghost', style: { marginTop: '8px' }, html: IC.plus + ' Sub-theme', onclick: () => themeModal(null, t.id) })));
    col.querySelector('.col-head').style.setProperty('--c', t.color);
    $$('.sub', col).forEach((x, i) => x.style.setProperty('--c', subs[i].color));
    board.append(col);
  });
  board.append(el('button', { class: 'add-col', html: IC.plus + '<div style="margin-top:6px">Add a theme</div>', onclick: () => themeModal(null) }));
  page.append(board); m.append(page);
}
function moveTheme(t, dir) {
  const tops = topThemes(); const i = tops.indexOf(t); const other = tops[i + dir]; if (!other) return;
  if (ro()) return;
  P.themes.forEach((x, k) => { if (x.order !== k) x.order = k; });
  [t.order, other.order] = [other.order, t.order]; sortList(P); touch('meta'); render();
}

/* ============ MAP TAB ============ */
const FAM = '"Inter","Noto Sans Thaana","Faruma","MV Faseyha",sans-serif';
const FAM_SVG = "Inter, 'Noto Sans Thaana', Faruma, 'MV Faseyha', sans-serif";
const NODE = {
  root: { w: 700, size: 17, padX: 20, padY: 12, max: 260 },
  theme: { w: 600, size: 14, padX: 15, padY: 9, max: 210 },
  sub: { w: 600, size: 13, padX: 13, padY: 7, max: 190 },
  code: { w: 500, size: 12.5, padX: 12, padY: 6, max: 210 },
};
const mctx = document.createElement('canvas').getContext('2d');
function nodeFont(type, rtl) { const n = NODE[type]; return `${n.w} ${rtl ? n.size * 1.12 : n.size}px ${FAM}`; }
function wrapText(text, font, maxW) {
  mctx.font = font; const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && mctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.length ? lines : [''];
}
function makeNode(type, label, color, count, extra) {
  const rtl = isTh(label); const n = NODE[type]; const font = nodeFont(type, rtl);
  const lines = wrapText(label, font, n.max); mctx.font = font;
  const tw = Math.max(...lines.map(l => mctx.measureText(l).width));
  const size = rtl ? n.size * 1.12 : n.size; const lh = size * (rtl ? 1.5 : 1.32);
  let bw = 0; const showCount = UI.map.counts && type !== 'root' && count != null;
  if (showCount) { mctx.font = `600 11px ${FAM}`; bw = Math.max(20, mctx.measureText(String(count)).width + 12); }
  const w = Math.ceil(tw + n.padX * 2 + (bw ? bw + 6 : 0));
  const h = Math.ceil(lines.length * lh + n.padY * 2);
  return Object.assign({ type, label, color, count, rtl, lines, font, size, lh, w, h, bw, children: [] }, extra || {});
}
function buildTree() {
  const { cnt } = stats();
  // refs per theme (unique segments)
  const themeSegs = new Map();
  const codeTheme = new Map(P.codes.map(c => [c.id, c.theme]));
  for (const d of docsInOrder()) for (const s of d.segments) {
    const ts = new Set();
    for (const cid of s.c) { const tid = codeTheme.get(cid); if (!tid) continue; const t = themeById(tid); if (!t) continue; ts.add(t.id); if (t.parent) ts.add(t.parent); }
    ts.forEach(tid => themeSegs.set(tid, (themeSegs.get(tid) || 0) + 1));
  }
  const root = makeNode('root', (P.center || P.name), '#1f2937', null, { kind: 'root' });
  const codeNode = (c, color) => makeNode('code', c.name, color, cnt.get(c.id) || 0, { kind: 'code', ref: c.id });
  const byCount = (a, b) => (cnt.get(b.id) || 0) - (cnt.get(a.id) || 0);
  for (const t of topThemes()) {
    const tn = makeNode('theme', t.name, t.color, themeSegs.get(t.id) || 0, { kind: 'theme', ref: t.id });
    for (const s of subThemes(t.id)) {
      const sn = makeNode('sub', s.name, s.color, themeSegs.get(s.id) || 0, { kind: 'theme', ref: s.id });
      if (UI.map.codes) P.codes.filter(c => c.theme === s.id).sort(byCount).forEach(c => sn.children.push(codeNode(c, s.color)));
      tn.children.push(sn);
    }
    if (UI.map.codes) P.codes.filter(c => c.theme === t.id).sort(byCount).forEach(c => tn.children.push(codeNode(c, t.color)));
    root.children.push(tn);
  }
  if (UI.map.unassigned) {
    const un = P.codes.filter(c => !(c.theme && themeById(c.theme))).sort(byCount);
    if (un.length) { const tn = makeNode('theme', 'Unassigned codes', '#9ca3af', null, { kind: 'unassigned' }); un.forEach(c => tn.children.push(codeNode(c, '#9ca3af'))); root.children.push(tn); }
  }
  return root;
}
function layoutHorizontal(root, twoSided) {
  const HG = 54, GROUP = 22, nodes = [], edges = [];
  const colW = [];
  (function walk(n, d) { n.depth = d; colW[d] = Math.max(colW[d] || 0, n.w); n.children.forEach(c => walk(c, d + 1)); })(root, 0);
  const gap = n => n.depth === 0 ? GROUP : (n.children.some(c => c.children.length) ? 12 : 7);
  const sh = n => n._sh != null ? n._sh : (n._sh = n.children.length ? Math.max(n.h, n.children.reduce((a, c) => a + sh(c), 0) + gap(n) * (n.children.length - 1)) : n.h);
  const colStart = [0, root.w / 2 + HG];
  for (let d = 1; d < colW.length; d++) colStart[d + 1] = colStart[d] + colW[d] + HG;
  let right = root.children, left = [];
  if (twoSided && root.children.length > 1) {
    const total = root.children.reduce((a, c) => a + sh(c), 0); let acc = 0; right = []; left = [];
    for (const c of root.children) { if (!right.length || acc + sh(c) / 2 <= total / 2) { right.push(c); acc += sh(c); } else left.push(c); }
  }
  root.x = -root.w / 2; root.y = -root.h / 2; root.cy = 0; nodes.push(root);
  const place = (n, top, side) => {
    n.cy = top + sh(n) / 2; n.y = n.cy - n.h / 2; n.side = side;
    n.x = side > 0 ? colStart[n.depth] : -colStart[n.depth] - n.w;
    nodes.push(n);
    if (n.children.length) {
      const tot = n.children.reduce((a, c) => a + sh(c), 0) + gap(n) * (n.children.length - 1);
      let y = n.cy - tot / 2;
      for (const c of n.children) { place(c, y, side); y += sh(c) + gap(n); }
    }
  };
  const placeSide = (list, side) => {
    const tot = list.reduce((a, c) => a + sh(c), 0) + GROUP * Math.max(0, list.length - 1);
    let y = -tot / 2; for (const c of list) { place(c, y, side); y += sh(c) + GROUP; }
  };
  placeSide(right, 1); placeSide(left, -1);
  const link = (p, c) => {
    const side = c.side;
    const x1 = side > 0 ? p.x + p.w : p.x, x2 = side > 0 ? c.x : c.x + c.w;
    const y1 = p.cy, y2 = c.cy, mx = (x1 + x2) / 2;
    edges.push({ d: `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`, color: c.color, w: edgeW(c) });
    c.children.forEach(k => link(c, k));
  };
  root.children.forEach(c => link(root, c));
  return { nodes, edges };
}
function edgeW(n) { if (n.count == null) return 1.6; return Math.min(5, 1.3 + Math.log2(1 + n.count) * .8); }
function layoutTopDown(root) {
  const COLG = 34, IND = 22, VG = 8, nodes = [root], edges = [];
  const cols = root.children.map(t => {
    const items = [t]; t.x = 0; t.y = 0; let y = t.h + 14;
    const add = (n, ind) => {
      for (const c of n.children) {
        c.x = ind; c.y = y; c._p = n; items.push(c); y += c.h + VG;
        if (c.children.length) { add(c, ind + IND); y += 6; }
      }
    };
    add(t, IND);
    return { t, items, width: Math.max(...items.map(i => i.x + i.w)), height: y };
  });
  const totalW = cols.reduce((a, c) => a + c.width, 0) + COLG * Math.max(0, cols.length - 1);
  let x0 = -totalW / 2; const ty = root.h + 60;
  root.x = -root.w / 2; root.y = 0;
  for (const col of cols) { col.items.forEach(i => { i.x += x0; i.y += ty; nodes.push(i); }); x0 += col.width + COLG; }
  const r = 8;
  for (const col of cols) {
    const t = col.t; const x2 = t.x + t.w / 2; const y1 = root.h, my = root.h + 30;
    edges.push({ d: `M0,${y1} V${my} H${x2.toFixed(1)} V${t.y}`, color: t.color, w: edgeW(t) });
    for (const c of col.items.slice(1)) {
      const p = c._p; const px = p.x + 12, py = p.y + p.h, cy = c.y + c.h / 2;
      edges.push({ d: `M${px.toFixed(1)},${py.toFixed(1)} V${(cy - r).toFixed(1)} Q${px.toFixed(1)},${cy.toFixed(1)} ${(px + r).toFixed(1)},${cy.toFixed(1)} H${c.x.toFixed(1)}`, color: c.color, w: edgeW(c) });
    }
  }
  return { nodes, edges };
}
function computeMap() {
  const root = buildTree();
  const L = UI.map.layout === 'topdown' ? layoutTopDown(root) : layoutHorizontal(root, UI.map.layout === 'mindmap');
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  L.nodes.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
  L.bounds = { x: x0 - 40, y: y0 - 40, w: x1 - x0 + 80, h: y1 - y0 + 80 };
  L.root = root;
  return L;
}
function nodeStyle(n) {
  if (n.type === 'root') return { fill: '#1f2937', stroke: '#1f2937', text: '#ffffff', sw: 0, badgeFill: 'rgba(255,255,255,.2)', badgeText: '#fff' };
  if (n.type === 'theme') return { fill: n.color, stroke: n.color, text: onColor(n.color), sw: 0, badgeFill: onColor(n.color) === '#ffffff' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.1)', badgeText: onColor(n.color) };
  if (n.type === 'sub') return { fill: tint(n.color, .82), stroke: n.color, text: '#1c1e22', sw: 1.5, badgeFill: '#ffffff', badgeText: '#1c1e22' };
  return { fill: '#ffffff', stroke: n.color, text: '#1c1e22', sw: 1.3, badgeFill: tint(n.color, .85), badgeText: '#1c1e22' };
}
function nodeRadius(n) { return n.lines.length === 1 ? n.h / 2 : 10; }
function textX(n) { const N = NODE[n.type]; const area = n.w - N.padX * 2 - (n.bw ? n.bw + 6 : 0); return n.x + N.padX + area / 2; }
function mapSVGString(L, exportMode) {
  const b = L.bounds; const out = [];
  if (exportMode) out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${Math.round(b.w)}" height="${Math.round(b.h)}" font-family="${FAM_SVG}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#ffffff"/>`);
  out.push('<g>');
  for (const e of L.edges) out.push(`<path d="${e.d}" fill="none" stroke="${e.color}" stroke-opacity="0.55" stroke-width="${e.w.toFixed(2)}" stroke-linecap="round"/>`);
  out.push('</g>');
  L.nodes.forEach((n, i) => {
    const st = nodeStyle(n); const N = NODE[n.type];
    out.push(`<g class="map-node" data-i="${i}"><rect class="box" x="${n.x.toFixed(1)}" y="${n.y.toFixed(1)}" width="${n.w}" height="${n.h}" rx="${nodeRadius(n)}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.sw}"${n.kind === 'unassigned' ? ' stroke-dasharray="4 3"' : ''}/>`);
    out.push(`<text font-family="${FAM_SVG}" font-size="${n.size}" font-weight="${N.w}" fill="${st.text}" text-anchor="middle" dominant-baseline="central"${n.rtl ? ' direction="rtl"' : ''}>`);
    const tx = textX(n);
    n.lines.forEach((ln, k) => out.push(`<tspan x="${tx.toFixed(1)}" y="${(n.y + N.padY + n.lh * (k + .5)).toFixed(1)}">${esc(ln)}</tspan>`));
    out.push('</text>');
    if (n.bw) {
      const bx = n.x + n.w - N.padX + 4 - n.bw, by = n.y + n.h / 2 - 9;
      out.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${n.bw.toFixed(1)}" height="18" rx="9" fill="${st.badgeFill}"/><text x="${(bx + n.bw / 2).toFixed(1)}" y="${(by + 9).toFixed(1)}" font-family="${FAM_SVG}" font-size="11" font-weight="600" fill="${st.badgeText}" text-anchor="middle" dominant-baseline="central">${n.count}</text>`);
    }
    out.push('</g>');
  });
  if (exportMode) out.push('</svg>');
  return out.join('');
}
function drawMapCanvas(L, scale) {
  const b = L.bounds; const c = document.createElement('canvas');
  c.width = Math.ceil(b.w * scale); c.height = Math.ceil(b.h * scale);
  const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.translate(-b.x, -b.y);
  ctx.fillStyle = '#fff'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.lineCap = 'round';
  for (const e of L.edges) { ctx.strokeStyle = rgba(e.color, .55); ctx.lineWidth = e.w; ctx.stroke(new Path2D(e.d)); }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  for (const n of L.nodes) {
    const st = nodeStyle(n); const N = NODE[n.type];
    rr(n.x, n.y, n.w, n.h, nodeRadius(n)); ctx.fillStyle = st.fill; ctx.fill();
    if (st.sw) { ctx.lineWidth = st.sw; ctx.strokeStyle = st.stroke; if (n.kind === 'unassigned') ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.font = n.font; ctx.fillStyle = st.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = n.rtl ? 'rtl' : 'ltr';
    const tx = textX(n); n.lines.forEach((ln, k) => ctx.fillText(ln, tx, n.y + N.padY + n.lh * (k + .5)));
    ctx.direction = 'ltr';
    if (n.bw) {
      const bx = n.x + n.w - N.padX + 4 - n.bw, by = n.y + n.h / 2 - 9;
      rr(bx, by, n.bw, 18, 9); ctx.fillStyle = st.badgeFill; ctx.fill();
      ctx.font = `600 11px ${FAM}`; ctx.fillStyle = st.badgeText; ctx.fillText(String(n.count), bx + n.bw / 2, by + 9.5);
    }
  }
  return c;
}
let mapView = null;
async function renderMap(m) {
  const page = el('div', { class: 'page' });
  const layoutCtl = el('div', { class: 'seg-ctl' }, [['mindmap', 'Mind map'], ['tree', 'Tree'], ['topdown', 'Top-down']].map(([k, l]) =>
    el('button', { class: UI.map.layout === k ? 'on' : '', text: l, onclick: () => { UI.map.layout = k; lsSet('tc:mapLayout', k); render(); } })));
  const chk = (key, label) => { const i = el('input', { type: 'checkbox' }); i.checked = UI.map[key]; i.addEventListener('change', () => { UI.map[key] = i.checked; drawMap(true); }); return el('label', { class: 'chk' }, i, label); };
  const center = el('input', { type: 'text', class: 'map-center', dir: 'auto', placeholder: 'Centre label (e.g. research question)', value: P.center || '' });
  let ct; center.addEventListener('input', () => { clearTimeout(ct); ct = setTimeout(() => { P.center = center.value.trim(); touch('meta'); drawMap(false); }, 350); });
  const exportWrap = el('div', { class: 'menu-wrap' });
  const exportBtn = el('button', { class: 'btn primary', text: 'Download ▾', onclick: e => {
    e.stopPropagation(); const old = $('.menu', exportWrap); if (old) { old.remove(); return; }
    const menu = el('div', { class: 'menu' },
      el('button', { onclick: () => { menu.remove(); exportPNG(); } }, 'PNG image', el('small', { text: 'High resolution, for slides and reports' })),
      el('button', { onclick: () => { menu.remove(); exportSVG(); } }, 'SVG vector', el('small', { text: 'Editable in Illustrator, Inkscape, Word' })));
    exportWrap.append(menu);
    setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 0);
  } });
  exportWrap.append(exportBtn);
  page.append(el('div', { class: 'page-bar' }, layoutCtl, center, chk('codes', 'Show codes'), chk('counts', 'Show counts'), chk('unassigned', 'Include unassigned'), el('span', { class: 'sp' }), exportWrap));
  const wrap = el('div', { class: 'map-wrap' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrap.append(svg, el('div', { class: 'map-zoom' },
    el('button', { title: 'Zoom in', text: '+', onclick: () => zoomBy(1 / 1.25) }),
    el('button', { title: 'Zoom out', text: '−', onclick: () => zoomBy(1.25) }),
    el('button', { title: 'Fit to screen', html: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" stroke="currentColor" stroke-width="1.5"/></svg>', onclick: () => fitMap() })));
  page.append(wrap); m.append(page);
  mapView = { svg, wrap, L: null, vb: null };
  if (!P.themes.length) {
    wrap.append(el('div', { class: 'empty', style: { position: 'absolute', inset: '0', margin: '12vh auto' } }, el('h3', { text: 'No themes yet' }), el('p', { text: 'Create themes on the Themes tab and drag your codes into them — the map is drawn from that structure.' }), el('button', { class: 'btn primary', text: 'Go to Themes', onclick: () => { UI.tab = 'themes'; render(); } })));
  }
  try { await Promise.race([Promise.all([document.fonts.load(`600 14px "Noto Sans Thaana"`, 'ދިވެހި'), document.fonts.load(`600 14px "Inter"`, 'Aa')]), sleep(2500)]); } catch (e) { }
  if (mapView && mapView.svg === svg) { drawMap(true); setupPanZoom(svg); }
}
function drawMap(refit) {
  if (!mapView) return;
  const L = computeMap(); mapView.L = L;
  mapView.svg.innerHTML = mapSVGString(L, false);
  if (refit || !mapView.vb) fitMap(); else applyVB();
  $$('.map-node', mapView.svg).forEach(g => g.addEventListener('click', () => {
    if (mapView.moved) return;
    const n = L.nodes[+g.dataset.i]; if (!n) return;
    if (n.kind === 'code') { UI.seg = { theme: '', code: n.ref, doc: '', q: '' }; UI.tab = 'segments'; render(); }
    else if (n.kind === 'theme') { const t = themeById(n.ref); t && themeModal(t); }
    else if (n.kind === 'root') { const i = $('.map-center'); i && i.focus(); }
  }));
}
function fitMap() {
  if (!mapView || !mapView.L) return;
  const b = mapView.L.bounds; const r = mapView.wrap.getBoundingClientRect();
  const aspect = (r.width || 800) / (r.height || 600);
  let w = b.w, h = b.h; if (w / h > aspect) h = w / aspect; else w = h * aspect;
  w = Math.max(w, 500); h = w / aspect;
  mapView.vb = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }; applyVB();
}
function applyVB() { const v = mapView.vb; mapView.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); }
function zoomBy(f, cx, cy) {
  const v = mapView.vb; if (!v) return;
  if (cx == null) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
  const nw = Math.max(150, Math.min(20000, v.w * f)); const k = nw / v.w;
  mapView.vb = { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: v.h * k }; applyVB();
}
function setupPanZoom(svg) {
  let drag = null;
  const toUser = (ex, ey) => { const r = svg.getBoundingClientRect(); const v = mapView.vb; return { x: v.x + (ex - r.left) / r.width * v.w, y: v.y + (ey - r.top) / r.height * v.h }; };
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = toUser(e.clientX, e.clientY); zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0015)), p.x, p.y); }, { passive: false });
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vb: { ...mapView.vb } }; mapView.moved = false; });
  window.addEventListener('pointermove', e => {
    if (!drag || !mapView || mapView.svg !== svg) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!mapView.moved && Math.hypot(dx, dy) < 4) return;
    if (!mapView.moved) { mapView.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (er) { } }
    svg.classList.add('panning');
    const r = svg.getBoundingClientRect();
    mapView.vb = { ...drag.vb, x: drag.vb.x - dx / r.width * drag.vb.w, y: drag.vb.y - dy / r.height * drag.vb.h }; applyVB();
  });
  window.addEventListener('pointerup', () => { drag = null; svg.classList.remove('panning'); setTimeout(() => { if (mapView) mapView.moved = false; }, 0); });
}
async function exportPNG() {
  if (!mapView || !mapView.L) return;
  const c = drawMapCanvas(mapView.L, 3);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  if (!blob) { toast('The map is too large to export as PNG — try SVG.', 'err'); return; }
  saveFile(safeName((P.center || P.name) + ' – theme map') + '.png', blob, 'image');
}
function exportSVG() {
  if (!mapView || !mapView.L) return;
  saveFile(safeName((P.center || P.name) + ' – theme map') + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + mapSVGString(mapView.L, true), 'text');
}

/* ============ SEGMENTS TAB ============ */
function allSegments() {
  const out = [];
  for (const d of docsInOrder()) for (const s of d.segments) out.push({ d, s });
  out.sort((a, b) => P.docOrder.indexOf(a.d.id) - P.docOrder.indexOf(b.d.id) || a.s.s - b.s.s);
  return out;
}
function orderedCodes() {
  const out = [];
  for (const t of topThemes()) {
    P.codes.filter(c => c.theme === t.id).forEach(c => out.push(c));
    subThemes(t.id).forEach(s => P.codes.filter(c => c.theme === s.id).forEach(c => out.push(c)));
  }
  P.codes.filter(c => !(c.theme && themeById(c.theme))).forEach(c => out.push(c));
  return out;
}
function renderSegments(m) {
  const f = UI.seg;
  const page = el('div', { class: 'page' });
  const themeSel = themeOptions(f.theme, 'All themes');
  const codeSel = el('select'); codeSel.append(el('option', { value: '', text: 'All codes' })); orderedCodes().forEach(c => codeSel.append(el('option', { value: c.id, text: c.name, selected: f.code === c.id })));
  const docSel = el('select'); docSel.append(el('option', { value: '', text: 'All documents' })); docsInOrder().forEach(d => docSel.append(el('option', { value: d.id, text: d.name, selected: f.doc === d.id })));
  const qIn = el('input', { type: 'search', placeholder: 'Search in segments…', dir: 'auto', value: f.q });
  const coders = [...new Set(allSegments().map(x => x.s.by).filter(Boolean))];
  resolvePeople(coders);
  const bySel = el('select'); bySel.append(el('option', { value: '', text: 'All coders' })); coders.forEach(id => bySel.append(el('option', { value: id, text: personName(id), selected: f.by === id })));
  bySel.addEventListener('change', () => { f.by = bySel.value; drawList(); });
  themeSel.addEventListener('change', () => { f.theme = themeSel.value; f.code = ''; render(); });
  codeSel.addEventListener('change', () => { f.code = codeSel.value; drawList(); });
  docSel.addEventListener('change', () => { f.doc = docSel.value; drawList(); });
  let qt; qIn.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { f.q = qIn.value.trim(); drawList(); }, 200); });
  const exportWrap = el('div', { class: 'menu-wrap' });
  exportWrap.append(el('button', { class: 'btn primary', text: 'Export ▾', onclick: e => {
    e.stopPropagation(); const old = $('.menu', exportWrap); if (old) { old.remove(); return; }
    const menu = el('div', { class: 'menu' },
      el('button', { onclick: () => { menu.remove(); exportReportDocx(); } }, 'Thematic report (Word)', el('small', { text: 'Themes → codes → quotes, ready for write-up' })),
      el('button', { onclick: () => { menu.remove(); exportSegmentsCSV(); } }, 'Coded segments (CSV)', el('small', { text: 'One row per code per segment — opens in Excel' })),
      el('button', { onclick: () => { menu.remove(); exportCodebookCSV(); } }, 'Codebook (CSV)', el('small', { text: 'Themes, codes, definitions, frequencies' })),
      el('button', { onclick: () => { menu.remove(); exportProject(); } }, 'Whole project (.json)', el('small', { text: 'Backup, or move to another device' })));
    exportWrap.append(menu);
    setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 0);
  } }));
  page.append(el('div', { class: 'page-bar' }, el('div', { class: 'seg-filters' }, themeSel, codeSel, docSel, coders.length > 1 ? bySel : null, qIn), el('span', { class: 'sp' }), exportWrap));
  const list = el('div', { class: 'seg-page' });
  page.append(list); m.append(page);
  function drawList() {
    list.innerHTML = '';
    const segs = allSegments();
    let codes = orderedCodes();
    if (f.theme) { const ids = [f.theme, ...subThemes(f.theme).map(s => s.id)]; codes = codes.filter(c => ids.includes(c.theme)); }
    if (f.code) codes = codes.filter(c => c.id === f.code);
    const ql = f.q.toLowerCase(); let total = 0;
    for (const c of codes) {
      const items = segs.filter(({ d, s }) => s.c.includes(c.id) && (!f.doc || d.id === f.doc) && (!f.by || s.by === f.by) && (!ql || segText(d, s).toLowerCase().includes(ql)));
      if (!items.length) continue;
      total += items.length;
      const tp = themePath(c);
      const nDocs = new Set(items.map(x => x.d.id)).size;
      const g = el('div', { class: 'seg-group' },
        el('h3', {}, el('span', { class: 'sw', style: { background: c.color } }), el('span', { text: c.name, dir: 'auto' }), el('small', { text: `${items.length} segment${items.length > 1 ? 's' : ''} · ${nDocs} document${nDocs > 1 ? 's' : ''}${tp.top ? ' · ' + tp.top.name + (tp.sub ? ' › ' + tp.sub.name : '') : ''}` })),
        c.desc ? el('div', { class: 'gdesc', text: c.desc, dir: 'auto' }) : null);
      for (const { d, s } of items) {
        const t = segText(d, s);
        const q = el('div', { class: 'quote' },
          el('div', { class: 'qt' + (isTh(t) ? ' tx' : ''), dir: 'auto', text: t }),
          s.m ? el('div', { class: 'memo', dir: 'auto', text: '✎ ' + s.m }) : null,
          el('div', { class: 'qm' }, el('span', { text: d.name, dir: 'auto' }), el('span', { text: '¶ ' + (paraIndexAt(d, s.s) + 1) }), s.by ? el('span', { text: 'coded by ' + personName(s.by) }) : null,
            s.c.length > 1 ? el('span', { text: 'also: ' + s.c.filter(x => x !== c.id).map(x => (codeById(x) || {}).name).filter(Boolean).join(', '), dir: 'auto' }) : null,
            el('button', { class: 'link', text: 'Show in document →', onclick: () => showInDoc(d.id, s.id) })));
        q.style.setProperty('--c', c.color);
        g.append(q);
      }
      list.append(g);
    }
    if (!total) list.append(el('div', { class: 'empty' }, el('h3', { text: P.codes.length ? 'No coded segments match' : 'Nothing coded yet' }), el('p', { text: P.codes.length ? 'Try clearing the filters.' : 'Go to the Code tab, select passages in a transcript and attach codes.' })));
  }
  drawList();
}
function showInDoc(docId, segId) {
  UI.tab = 'code'; UI.docId = docId; UI.focus = null; render();
  setTimeout(() => {
    const span = $$('.doc-body .hl').find(s => s.dataset.segs.split(',').includes(segId));
    if (span) { span.scrollIntoView({ block: 'center' }); span.classList.add('flash'); }
  }, 30);
}
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
async function exportSegmentsCSV() {
  await ensureAllText();
  const rows = [['Theme', 'Sub-theme', 'Code', 'Document', 'Paragraph', 'Segment', 'Memo', 'Other codes on this segment', 'Coded by']];
  for (const { d, s } of allSegments()) for (const cid of s.c) {
    const c = codeById(cid); if (!c) continue; const tp = themePath(c);
    rows.push([tp.top ? tp.top.name : '', tp.sub ? tp.sub.name : '', c.name, d.name, paraIndexAt(d, s.s) + 1, segText(d, s), s.m || '', s.c.filter(x => x !== cid).map(x => (codeById(x) || {}).name).filter(Boolean).join('; '), s.by ? personName(s.by) : '']);
  }
  saveFile(safeName(P.name + ' – coded segments') + '.csv', csv(rows), 'text');
}
function exportCodebookCSV() {
  const { cnt, docs } = stats();
  const rows = [['Theme', 'Theme description', 'Sub-theme', 'Code', 'Code description', 'Segments', 'Documents']];
  for (const c of orderedCodes()) { const tp = themePath(c); rows.push([tp.top ? tp.top.name : '(unassigned)', tp.top ? tp.top.desc : '', tp.sub ? tp.sub.name : '', c.name, c.desc || '', cnt.get(c.id) || 0, docs.has(c.id) ? docs.get(c.id).size : 0]); }
  saveFile(safeName(P.name + ' – codebook') + '.csv', csv(rows), 'text');
}
/* minimal .docx writer */
const xesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
function wPara(text, o = {}) {
  const rtl = isTh(text);
  const ppr = `<w:pPr>${o.keep ? '<w:keepNext/>' : ''}${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ''}${rtl ? '<w:bidi/>' : ''}<w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 120 : o.after}" w:line="${rtl ? 320 : 276}" w:lineRule="auto"/>${o.indent ? `<w:ind w:left="${o.indent}" w:right="${o.indent}"/>` : ''}</w:pPr>`;
  const sz = Math.round((o.size || 11) * 2);
  const rpr = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Faruma"/>${o.bold ? '<w:b/><w:bCs/>' : ''}${o.italic ? '<w:i/><w:iCs/>' : ''}${o.color ? `<w:color w:val="${o.color.replace('#', '')}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${rtl ? sz + 2 : sz}"/>${rtl ? '<w:rtl/>' : ''}</w:rPr>`;
  return `<w:p>${ppr}<w:r>${rpr}<w:t xml:space="preserve">${xesc(text)}</w:t></w:r></w:p>`;
}
async function exportReportDocx() {
  await ensureAllText();
  const JSZip = await waitFor('JSZip');
  if (!JSZip) { toast('The Word writer couldn’t load — try again in a moment.', 'err'); return; }
  const { cnt, docs } = stats(); const segs = allSegments(); const body = [];
  body.push(wPara(P.name, { size: 22, bold: true, after: 60 }));
  if (P.center) body.push(wPara(P.center, { size: 13, italic: true, color: '#555555', after: 60 }));
  body.push(wPara(`Thematic analysis report · ${docsInOrder().length} documents · ${P.codes.length} codes · ${topThemes().length} themes · ${P.themes.length - topThemes().length} sub-themes · ${new Date().toLocaleDateString()}`, { size: 9.5, color: '#777777', after: 280 }));
  const codeBlock = (c, level) => {
    const items = segs.filter(x => x.s.c.includes(c.id));
    body.push(wPara(`${c.name}  (${items.length} segment${items.length === 1 ? '' : 's'}, ${docs.has(c.id) ? docs.get(c.id).size : 0} document${docs.has(c.id) && docs.get(c.id).size === 1 ? '' : 's'})`, { size: level ? 11.5 : 12, bold: true, color: c.color, before: 160, after: 60, keep: true }));
    if (c.desc) body.push(wPara(c.desc, { size: 10, italic: true, color: '#555555', after: 80 }));
    for (const { d, s } of items) {
      body.push(wPara('“' + segText(d, s) + '”', { indent: 425, size: 11, after: 20, shade: 'F6F5F1' }));
      body.push(wPara(`— ${d.name}, ¶${paraIndexAt(d, s.s) + 1}${s.m ? ' · Memo: ' + s.m : ''}`, { indent: 425, size: 9, color: '#777777', after: 120 }));
    }
  };
  for (const t of topThemes()) {
    body.push(wPara('Theme: ' + t.name, { size: 16, bold: true, color: t.color, before: 360, after: 80, keep: true }));
    if (t.desc) body.push(wPara(t.desc, { size: 11, color: '#333333' }));
    P.codes.filter(c => c.theme === t.id).forEach(c => codeBlock(c, 0));
    for (const s of subThemes(t.id)) {
      body.push(wPara('Sub-theme: ' + s.name, { size: 13.5, bold: true, color: s.color, before: 240, after: 60, keep: true }));
      if (s.desc) body.push(wPara(s.desc, { size: 10.5, color: '#333333' }));
      P.codes.filter(c => c.theme === s.id).forEach(c => codeBlock(c, 1));
    }
  }
  const un = P.codes.filter(c => !(c.theme && themeById(c.theme)));
  if (un.length) { body.push(wPara('Codes not yet in a theme', { size: 16, bold: true, color: '#777777', before: 360, after: 80, keep: true })); un.forEach(c => codeBlock(c, 0)); }
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', docXml);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveFile(safeName(P.name + ' – thematic report') + '.docx', blob, 'binary');
}

/* ============ OVERVIEW TAB ============ */
function renderOverview(m) {
  const page = el('div', { class: 'page' });
  const ov = el('div', { class: 'ov' });
  const docs = docsInOrder(); const { cnt } = stats();
  const nSegs = docs.reduce((a, d) => a + d.segments.length, 0);
  const coverage = d => { const iv = d.segments.map(s => [s.s, s.e]).sort((a, b) => a[0] - b[0]); let tot = 0, ce = -1, cs = -1; for (const [s, e] of iv) { if (s > ce) { if (ce > cs) tot += ce - cs; cs = s; ce = e; } else ce = Math.max(ce, e); } if (ce > cs) tot += ce - cs; const L = fullText(d).text.length || 1; return tot / L; };
  const totalChars = docs.reduce((a, d) => a + fullText(d).text.length, 0) || 1;
  const covAll = docs.reduce((a, d) => a + coverage(d) * fullText(d).text.length, 0) / totalChars;
  ov.append(el('div', { class: 'cards' },
    [[docs.length, 'Documents'], [P.codes.length, 'Codes'], [topThemes().length, 'Themes'], [P.themes.length - topThemes().length, 'Sub-themes'], [nSegs, 'Coded segments'], [Math.round(covAll * 100) + '%', 'Of text coded']]
      .map(([v, l]) => el('div', { class: 'card' }, el('div', { class: 'v', text: v }), el('div', { class: 'l', text: l })))));
  if (!P.codes.length || !docs.length) { ov.append(el('div', { class: 'empty' }, el('h3', { text: 'Nothing to compare yet' }), el('p', { text: 'Once you code a few documents, this table shows how often each code and theme appears in each document.' }))); page.append(ov); m.append(page); return; }
  const max = Math.max(1, ...P.codes.map(c => Math.max(...docs.map(d => d.segments.filter(s => s.c.includes(c.id)).length))));
  const per = (ids, d) => d.segments.filter(s => s.c.some(x => ids.includes(x))).length;
  const tbl = el('table', { class: 'mx' });
  tbl.append(el('thead', {}, el('tr', {}, el('th', { class: 'n', text: 'Theme / code' }), docs.map(d => el('th', { title: d.name, text: trunc(d.name, 22), dir: 'auto' })), el('th', { text: 'Total' }), el('th', { text: 'Docs' }))));
  const tb = el('tbody');
  const cell = (v, color) => { const td = el('td', { class: 'c', text: v || '·' }); if (v) { td.style.background = rgba(color, .08 + .5 * v / max); if (v / max > .65) td.style.color = '#fff'; } else td.style.color = '#c9c6be'; return td; };
  const codeRow = (c, deep) => {
    const vals = docs.map(d => d.segments.filter(s => s.c.includes(c.id)).length);
    tb.append(el('tr', { class: 'code' + (deep ? ' deep' : '') }, el('td', { class: 'n' }, el('span', { class: 'sw-inline', style: { background: c.color } }), el('span', { dir: 'auto', text: c.name })), vals.map(v => cell(v, c.color)), el('td', { class: 'c', text: cnt.get(c.id) || 0 }), el('td', { class: 'c', text: vals.filter(Boolean).length })));
  };
  const groupRow = (t, ids, cls) => {
    const vals = docs.map(d => per(ids, d)); const tot = vals.reduce((a, b) => a + b, 0);
    tb.append(el('tr', { class: cls }, el('td', { class: 'n' }, el('span', { class: 'sw-inline', style: { background: t.color } }), el('span', { dir: 'auto', text: t.name })), vals.map(v => el('td', { class: 'c', text: v || '·' })), el('td', { class: 'c', text: tot }), el('td', { class: 'c', text: vals.filter(Boolean).length })));
  };
  for (const t of topThemes()) {
    const subs = subThemes(t.id);
    const ids = P.codes.filter(c => c.theme === t.id || subs.some(s => s.id === c.theme)).map(c => c.id);
    groupRow(t, ids, 'th');
    P.codes.filter(c => c.theme === t.id).forEach(c => codeRow(c, false));
    for (const s of subs) { const sids = P.codes.filter(c => c.theme === s.id).map(c => c.id); groupRow(s, sids, 'mxsub'); P.codes.filter(c => c.theme === s.id).forEach(c => codeRow(c, true)); }
  }
  const un = P.codes.filter(c => !(c.theme && themeById(c.theme)));
  if (un.length) { tb.append(el('tr', { class: 'th' }, el('td', { class: 'n', text: 'Not in a theme', colspan: docs.length + 3 }))); un.forEach(c => codeRow(c, false)); }
  tbl.append(tb);
  tbl.append(el('tfoot', {}, el('tr', {}, el('td', { class: 'n', text: '% of text coded' }), docs.map(d => el('td', { class: 'c', text: Math.round(coverage(d) * 100) + '%' })), el('td', { class: 'c', text: Math.round(covAll * 100) + '%' }), el('td'))));
  ov.append(el('div', { class: 'tbl-wrap' }, tbl));
  ov.append(el('p', { class: 'hint', style: { maxWidth: '1100px', margin: '10px auto' }, text: 'Cells count coded segments. Theme rows count segments carrying any code in that theme (a segment is counted once).' }));
  page.append(ov); m.append(page);
}

/* ============ sample project ============ */
function sampleProject(space) {
  const p = newProject('Sample – Teachers’ experiences of online teaching', space);
  p.center = 'How did teachers experience the shift to online teaching?';
  const T = (name, color, desc, parent) => { const t = { id: 't' + uid(), name, color, desc, parent: parent || null, order: p.themes.length }; p.themes.push(t); return t; };
  const t1 = T('Barriers to online teaching', '#dc2626', 'Conditions that made teaching and learning online difficult.');
  const t1a = T('Infrastructure', '#dc2626', 'Connectivity and devices.', t1.id);
  const t1b = T('Student engagement', '#ea580c', 'Difficulty keeping students involved.', t1.id);
  const t2 = T('Affordances of online learning', '#059669', 'Benefits teachers noticed.');
  const t3 = T('Professional support', '#2563eb', 'Help available to teachers.');
  const C = (name, color, theme, desc) => { const c = { id: 'c' + uid(), name, color, desc: desc || '', theme: theme ? theme.id : null, at: p.codes.length + 1 }; p.codes.push(c); return c; };
  const cSudden = C('Sudden transition', '#7c3aed', null, 'Little or no time to prepare for the move online.');
  const cConn = C('Poor connectivity', '#dc2626', t1a, 'Unstable or unavailable internet.');
  const cDev = C('Device access / equity', '#d97706', t1a, 'Students lacking suitable devices; widening gaps.');
  const cEng = C('Low student engagement', '#ea580c', t1b);
  const cCam = C('Cameras off', '#db2777', t1b);
  const cRec = C('Recorded lessons', '#059669', t2, 'Teachers recording explanations or lessons for later viewing.');
  const cRev = C('ފިލާވަޅު އަލުން ބެލުން', '#0d9488', t2, 'Students reviewing lessons again (revisiting content).');
  const cPar = C('Parental involvement', '#65a30d', t2);
  const cTrain = C('Lack of training', '#2563eb', t3, 'No or insufficient preparation from the school.');
  const cPeer = C('Peer support', '#4f46e5', t3, 'Colleagues helping each other.');
  const D = (name, paras, codings) => {
    const d = { id: 'd' + uid(), name, added: Date.now() + p.docOrder.length, paras, segments: [], loaded: true }; const text = paras.join('\n');
    for (const [phrase, codes] of codings) { const s = text.indexOf(phrase); if (s < 0) continue; d.segments.push({ id: 's' + uid(), s, e: s + phrase.length, c: codes.map(c => c.id), m: '', by: Store.uid || null, at: Date.now() }); }
    p.docs[d.id] = d; p.docOrder.push(d.id);
  };
  D('Interview 01 – Teacher A (English)', [
    'Interviewer: Thank you for agreeing to talk with us. Could you describe how you started teaching online during the school closures?',
    'Teacher A: Honestly, it was very sudden. We had one weekend to move everything online. I had never used Google Classroom before, so the first two weeks were mostly trial and error.',
    'Interviewer: What were the biggest challenges you faced?',
    'Teacher A: The internet connection on our island was the biggest problem. Some students could only join from their parents’ phones, and the connection dropped every few minutes. I also found it hard to know whether students were really following, because most of them kept their cameras off.',
    'Interviewer: Were there any positive experiences?',
    'Teacher A: Yes, actually. I started recording short videos of my explanations, and students told me they watched them again before tests. Parents also became more involved because they could see what their children were learning.',
    'Interviewer: What support did you receive from the school?',
    'Teacher A: Very little at the start. The school sent us a guideline, but there was no real training. Later, a colleague organised small sessions after school where we shared tips. That peer support helped me more than anything else.',
    'Interviewer: If you could change one thing, what would it be?',
    'Teacher A: Proper training before we are expected to teach online, and devices for students who don’t have them. Without that, online learning increases the gap between students.'
  ], [
    ['it was very sudden. We had one weekend to move everything online.', [cSudden]],
    ['I had never used Google Classroom before, so the first two weeks were mostly trial and error.', [cSudden, cTrain]],
    ['The internet connection on our island was the biggest problem.', [cConn]],
    ['Some students could only join from their parents’ phones, and the connection dropped every few minutes.', [cConn, cDev]],
    ['I also found it hard to know whether students were really following, because most of them kept their cameras off.', [cEng, cCam]],
    ['I started recording short videos of my explanations, and students told me they watched them again before tests.', [cRec, cRev]],
    ['Parents also became more involved because they could see what their children were learning.', [cPar]],
    ['The school sent us a guideline, but there was no real training.', [cTrain]],
    ['a colleague organised small sessions after school where we shared tips. That peer support helped me more than anything else.', [cPeer]],
    ['Proper training before we are expected to teach online', [cTrain]],
    ['devices for students who don’t have them. Without that, online learning increases the gap between students.', [cDev]],
  ]);
  D('Interview 02 – Teacher B (ދިވެހި)', [
    'ސުވާލު: އޮންލައިންކޮށް ކިޔަވައިދިނުމުގެ ތަޖުރިބާ ކިހިނެއް؟',
    'ޖަވާބު: ފުރަތަމަ ދުވަސްތަކުގައި ވަރަށް އުނދަގޫވި. އިންޓަރނެޓް ކަނޑާލާތީ ކުލާސްތަކަށް ވަދެވެނީ ދަތިކޮށް.',
    'ސުވާލު: ދަރިވަރުންގެ ބައިވެރިވުން ކިހިނެއް؟',
    'ޖަވާބު: ދަރިވަރުން ބައިވެރިކުރުމަކީ ބޮޑު ގޮންޖެހުމެއް. ކެމެރާ ހުޅުވާ ދަރިވަރުން ވަރަށް މަދު.',
    'ސުވާލު: ފައިދާއެއް ފެނުނުތަ؟',
    'ޖަވާބު: އާން. ވީޑިއޯ ރެކޯޑިންގްސް ހިއްސާކުރެވޭތީ ދަރިވަރުންނަށް ފިލާވަޅުތައް އަލުން ބަލާލެވޭ.',
    'ސުވާލު: ސްކޫލުން ލިބުނު އެހީ ކިހިނެއް؟',
    'ޖަވާބު: ތަމްރީނެއް ނުލިބޭ. އެކުވެރި ޓީޗަރުންގެ އެހީތެރިކަމުން ކުރިއަށް ދެވުނީ.'
  ], [
    ['ފުރަތަމަ ދުވަސްތަކުގައި ވަރަށް އުނދަގޫވި.', [cSudden]],
    ['އިންޓަރނެޓް ކަނޑާލާތީ ކުލާސްތަކަށް ވަދެވެނީ ދަތިކޮށް.', [cConn]],
    ['ދަރިވަރުން ބައިވެރިކުރުމަކީ ބޮޑު ގޮންޖެހުމެއް.', [cEng]],
    ['ކެމެރާ ހުޅުވާ ދަރިވަރުން ވަރަށް މަދު.', [cCam]],
    ['ވީޑިއޯ ރެކޯޑިންގްސް ހިއްސާކުރެވޭތީ ދަރިވަރުންނަށް ފިލާވަޅުތައް އަލުން ބަލާލެވޭ.', [cRec, cRev]],
    ['ތަމްރީނެއް ނުލިބޭ.', [cTrain]],
    ['އެކުވެރި ޓީޗަރުންގެ އެހީތެރިކަމުން ކުރިއަށް ދެވުނީ.', [cPeer]],
  ]);
  return p;
}

/* ============ boot ============ */
window.addEventListener('resize', () => { if (UI.tab === 'map' && mapView && mapView.L) fitMap(); });
(async function boot() {
  $('#main').innerHTML = '<div class="loading">Loading…</div>';
  let me;
  try { me = await API.get('/api/me'); }
  catch (e) {
    if (e.code === 401) return;
    $('#main').innerHTML = '';
    $('#main').append(el('div', { class: 'empty' }, el('h3', { text: e.code === 503 ? 'Setup needed' : 'Can\u2019t reach the server' }), el('p', { text: e.message })));
    return;
  }
  ME.id = me.id; ME.name = me.name; ME.role = me.role; ME.email = me.email; ME.google = me.google; ME.hasPassword = me.hasPassword; Store.uid = me.id;
  const qmsg = new URLSearchParams(location.search).get('msg');
  if (qmsg) { history.replaceState(null, '', '/'); setTimeout(() => toast(qmsg === 'google-linked' ? 'Your Google account is connected. You can now sign in with Google.' : qmsg === 'google-in-use' ? 'That Google account is already used by another person here.' : '', qmsg === 'google-in-use' ? 'err' : undefined), 300); }
  people.set(me.id, { name: me.name });
  $('#adminTab').classList.toggle('hidden', !isOwner());
  renderUserMenu(); loadPeople(); startLive(); setStatus('');
  let list = [];
  try { list = await API.get('/api/projects'); } catch (e) { toast('Couldn’t load projects: ' + e.message, 'err'); }
  const last = lsGet('tc:last');
  const pick = list.find(x => x.id === last) || list[0];
  if (pick) await openProject(pick.id); else render();
  refreshAdminBadge();
})();
