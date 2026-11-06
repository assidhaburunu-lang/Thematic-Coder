'use strict';
const $ = s => document.querySelector(s);
const show = (el, kind, text) => { el.className = 'msg ' + kind; el.textContent = text; };
const hide = el => el.className = 'msg hidden';

async function post(url, body) {
  let r;
  try { r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw new Error('Can’t reach the server. Check your connection.'); }
  let data = {}; try { data = await r.json(); } catch (e) { }
  if (!r.ok) throw new Error(data.error || 'Something went wrong (' + r.status + ')');
  return data;
}
function setTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#loginForm').classList.toggle('hidden', t !== 'login');
  $('#regForm').classList.toggle('hidden', t !== 'register');
  (t === 'login' ? $('#lName') : $('#rName')).focus();
  history.replaceState(null, '', t === 'register' ? '#register' : '#login');
}
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const btn = e.target.querySelector('button.go'); const msg = $('#loginMsg'); hide(msg);
  const name = $('#lName').value.trim(), password = $('#lPass').value;
  if (!name || !password) { show(msg, 'err', 'Enter your name and password.'); return; }
  btn.disabled = true;
  try { await post('/api/auth/login', { name, password }); location.href = '/'; }
  catch (er) { show(msg, er.message.includes('waiting') ? 'info' : 'err', er.message); btn.disabled = false; }
});

$('#regForm').addEventListener('submit', async e => {
  e.preventDefault(); const btn = e.target.querySelector('button.go'); const msg = $('#regMsg'); hide(msg);
  const name = $('#rName').value.trim(), password = $('#rPass').value;
  if (name.length < 2) { show(msg, 'err', 'Enter a name (at least 2 characters).'); return; }
  if (password.length < 8) { show(msg, 'err', 'Password must be at least 8 characters.'); return; }
  if (password !== $('#rPass2').value) { show(msg, 'err', 'The passwords don’t match.'); return; }
  btn.disabled = true;
  try {
    const r = await post('/api/auth/signup', { name, password });
    if (r.owner) { location.href = '/'; return; }
    e.target.reset();
    show(msg, 'ok', 'Account created! The owner needs to approve it before you can log in. Try logging in once they’ve let you know.');
    btn.disabled = false;
  } catch (er) { show(msg, 'err', er.message); btn.disabled = false; }
});

const MSGS = {
  pending: ['info', 'Your account has been created and is waiting for the owner\u2019s approval. Try again once they\u2019ve let you know.'],
  disabled: ['err', 'This account has been disabled. Contact the owner.'],
  closed: ['err', 'Sign-ups are closed, so a new account can\u2019t be created. Ask the owner.'],
  'google-off': ['err', 'Google sign-in isn\u2019t set up on this site.'],
  'google-cancelled': ['info', 'Google sign-in was cancelled.'],
  'google-expired': ['err', 'The sign-in took too long or was started in another tab. Please try again.'],
  'google-failed': ['err', 'Google sign-in didn\u2019t work. Please try again.'],
  'google-unverified': ['err', 'Your Google email address isn\u2019t verified.'],
  'google-domain': ['err', 'Only email addresses from approved domains can sign in here.'],
  'login-first': ['info', 'Log in first, then connect your Google account from your name menu.'],
};
(async function init() {
  setTab(location.hash === '#register' ? 'register' : 'login');
  const msg = new URLSearchParams(location.search).get('msg');
  if (msg && MSGS[msg]) { const [k, t] = MSGS[msg]; const box = $('#topMsg'); show(box, k, t); $('#gwrap').classList.remove('hidden'); }
  try { const me = await fetch('/api/me', { credentials: 'same-origin' }); if (me.ok) { location.href = '/'; return; } } catch (e) { }
  try {
    const res = await fetch('/api/auth/status'); const r = await res.json();
    if (!res.ok) {
      show($('#loginMsg'), 'err', r.error || 'The server isn\u2019t ready yet.');
      show($('#regMsg'), 'err', r.error || 'The server isn\u2019t ready yet.');
      return;
    }
    if (r.google) $('#gwrap').classList.remove('hidden');
    else if (!msg) $('#gwrap').classList.add('hidden');
    else document.querySelectorAll('#gwrap .gbtn, #gwrap .or').forEach(e => e.classList.add('hidden'));
    if (!r.hasUsers) {
      $('#ownerNote').classList.remove('hidden'); setTab('register');
      $('#foot').textContent = 'Set up the owner account first, then share this page’s address with your members.';
    } else if (!r.signupsOpen) {
      document.querySelector('[data-tab="register"]').classList.add('hidden');
      $('#tabs').style.gridTemplateColumns = '1fr';
      $('#foot').textContent = 'Sign-ups are currently closed. Ask the owner if you need an account.';
      setTab('login');
    }
  } catch (e) { }
})();
