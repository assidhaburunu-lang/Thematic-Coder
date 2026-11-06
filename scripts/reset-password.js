'use strict';
// Usage: npm run reset-password -- "<name>" "<new password>" [--owner]
// Resets a user's password from the command line (e.g. if the owner forgets theirs).
// Uses the same database settings as the app: set DATABASE_URL to your Postgres/Neon
// connection string (copy it from Vercel → Storage), or leave it unset for the built-in database.
const fs = require('node:fs');
const path = require('node:path');
try { if (fs.existsSync(path.join(__dirname, '..', '.env'))) process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch (_) { }
const { getDb, hashPassword, nameKey } = require('../lib/app');

(async () => {
  const args = process.argv.slice(2);
  const makeOwner = args.includes('--owner');
  const [name, password] = args.filter(a => a !== '--owner');
  if (!name || !password) { console.error('Usage: npm run reset-password -- "<name>" "<new password>" [--owner]'); process.exit(1); }
  if (password.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }
  const db = await getDb();
  const user = (await db.query('SELECT * FROM users WHERE name_key = $1', [nameKey(name)])).rows[0];
  if (!user) { console.error(`No account named "${name}".`); process.exit(1); }
  await db.query('UPDATE users SET pass = $1 WHERE id = $2', [await hashPassword(password), user.id]);
  await db.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
  if (makeOwner) await db.query("UPDATE users SET role = 'owner', status = 'active' WHERE id = $1", [user.id]);
  console.log(`Password updated for "${user.name}"${makeOwner ? ' (now an active owner)' : ''}.`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
