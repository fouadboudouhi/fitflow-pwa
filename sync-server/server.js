// Keeps the snapshots of several Volumora installations, one account each. No database, no dependencies: every
// account is a folder. Registration needs an invitation code from whoever runs the server, so a public address does
// not fill the disk. Older versions of each account stay, so a mistake can be undone.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

const KEEP_LATEST = 20;
const KEEP_DAILY_DAYS = 60;
const MAX_FAILURES = 10;
const FAILURE_WINDOW = 10 * 60 * 1000;
const DAY = 86400000;
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const MIN_PASSWORD = 8;
const VERSION = /^\d{13}-[0-9a-f]{8}$/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashPassword = (password, salt = randomBytes(16).toString('hex')) =>
  `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const passwordMatches = (password, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
};
const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};
// Written whole and renamed into place, so a crash never leaves a half file.
async function writeJson(file, value) {
  const temporary = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, file);
}

// What the admin script and the server share: accounts and invitations on disk.
export function store(dataDir) {
  const usersDir = join(dataDir, 'users');
  const invitesFile = join(dataDir, 'invites.json');
  const accountFile = (name) => join(usersDir, name, 'account.json');
  const account = (name) => readJson(accountFile(name), null);
  const saveAccount = async (name, data) => {
    await mkdir(join(usersDir, name, 'snapshots'), { recursive: true });
    await writeJson(accountFile(name), data);
  };
  return {
    dataDir,
    usersDir,
    account,
    saveAccount,
    snapshotsDir: (name) => join(usersDir, name, 'snapshots'),
    users: async () => (await readdir(usersDir).catch(() => [])).filter((name) => USERNAME.test(name)).sort(),
    invites: () => readJson(invitesFile, []),
    saveInvites: async (list) => {
      await mkdir(dataDir, { recursive: true });
      await writeJson(invitesFile, list);
    },
    async createInvite() {
      const code = randomBytes(6).toString('hex').match(/.{4}/g).join('-');
      await this.saveInvites([...(await this.invites()), { code, createdAt: new Date().toISOString() }]);
      return code;
    },
    async register(name, password, invite) {
      if (!USERNAME.test(name)) return { error: 'username' };
      if (String(password).length < MIN_PASSWORD) return { error: 'password' };
      const invites = await this.invites();
      const found = invites.find((i) => i.code === String(invite).trim().toLowerCase() && !i.usedBy);
      if (!found) return { error: 'invite' };
      if (await account(name)) return { error: 'taken' };
      found.usedBy = name;
      found.usedAt = new Date().toISOString();
      await saveAccount(name, { password: hashPassword(password), createdAt: found.usedAt, sessions: [] });
      await this.saveInvites(invites);
      return { ok: true };
    },
    async setPassword(name, password) {
      const data = await account(name);
      if (!data) return false;
      // Every device has to sign in again with the new password.
      await saveAccount(name, { ...data, password: hashPassword(password), sessions: [] });
      return true;
    },
  };
}

export function createSyncServer({ dataDir, origins, maxBytes = 64 * 1024 * 1024, now = Date.now }) {
  const db = store(dataDir);
  const failures = new Map();

  const versions = async (name) =>
    (await readdir(db.snapshotsDir(name)).catch(() => []))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.slice(0, -5))
      .filter((version) => VERSION.test(version))
      .sort();

  // Newest ones, plus the last one of each recent day.
  async function prune(name) {
    const all = await versions(name);
    const keep = new Set(all.slice(-KEEP_LATEST));
    const days = new Map();
    all.forEach((version) => {
      const at = Number(version.split('-')[0]);
      if (now() - at <= KEEP_DAILY_DAYS * DAY) days.set(new Date(at).toISOString().slice(0, 10), version);
    });
    days.forEach((version) => keep.add(version));
    await Promise.all(
      all.filter((v) => !keep.has(v)).map((v) => rm(join(db.snapshotsDir(name), `${v}.json`), { force: true }))
    );
  }

  // Too much data is read to its end and thrown away, so the client still gets a proper answer.
  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size <= maxBytes) chunks.push(chunk);
      });
      req.on('end', () =>
        size > maxBytes
          ? reject(Object.assign(new Error('too large'), { status: 413 }))
          : resolve(Buffer.concat(chunks))
      );
      req.on('error', reject);
    });

  const session = async (token) => {
    if (!token || !token.includes('.')) return null;
    const [name, secret] = token.split('.');
    const data = await db.account(name);
    const hashed = sha256(secret);
    return data?.sessions?.some((s) => s.hash === hashed) ? { name, data } : null;
  };
  const openSession = async (name, data) => {
    const secret = randomBytes(32).toString('hex');
    const sessions = [...(data.sessions || []), { hash: sha256(secret), at: new Date(now()).toISOString() }].slice(-20);
    await db.saveAccount(name, { ...data, sessions });
    return `${name}.${secret}`;
  };

  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = origins.includes(origin)
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': 'authorization, content-type, if-match',
          'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
          'access-control-expose-headers': 'etag',
          'access-control-max-age': '600',
          vary: 'origin',
        }
      : {};
    const send = (status, body = null, headers = {}) => {
      res.writeHead(status, { ...cors, 'cache-control': 'no-store', ...headers });
      res.end(body);
    };
    const json = (status, value, headers) =>
      send(status, JSON.stringify(value), { 'content-type': 'application/json', ...headers });
    try {
      if (req.method === 'OPTIONS') return send(204);
      const { pathname } = new URL(req.url, 'http://local');
      if (pathname === '/v1/health') return json(200, { ok: true });

      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
      const failed = failures.get(ip);
      if (failed && now() - failed.at > FAILURE_WINDOW) failures.delete(ip);
      if (failures.get(ip)?.count >= MAX_FAILURES) return json(429, { error: 'too many attempts' });
      const failure = (status, error) => {
        failures.set(ip, { count: (failures.get(ip)?.count || 0) + 1, at: now() });
        return json(status, { error });
      };
      const bodyJson = async () => JSON.parse((await readBody(req)).toString('utf8') || '{}');

      if (req.method === 'POST' && pathname === '/v1/register') {
        const { username, password, invite } = await bodyJson();
        const name = String(username ?? '').trim().toLowerCase();
        const result = await db.register(name, String(password ?? ''), invite ?? '');
        if (result.error) return failure(result.error === 'invite' ? 403 : 400, result.error);
        failures.delete(ip);
        return json(200, { token: await openSession(name, await db.account(name)) });
      }
      if (req.method === 'POST' && pathname === '/v1/login') {
        const { username, password } = await bodyJson();
        const name = String(username ?? '').trim().toLowerCase();
        const data = USERNAME.test(name) ? await db.account(name) : null;
        if (!data || !passwordMatches(String(password ?? ''), data.password)) return failure(401, 'user');
        failures.delete(ip);
        return json(200, { token: await openSession(name, data) });
      }

      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const who = await session(token);
      if (!who) return failure(401, 'session');
      failures.delete(ip);
      const { name } = who;
      if (req.method === 'POST' && pathname === '/v1/logout') {
        const hashed = sha256(token.split('.')[1]);
        await db.saveAccount(name, { ...who.data, sessions: who.data.sessions.filter((s) => s.hash !== hashed) });
        return json(200, { ok: true });
      }

      const all = await versions(name);
      const latest = all.at(-1);
      const file = (version) => join(db.snapshotsDir(name), `${version}.json`);
      if (pathname === '/v1/snapshot' && req.method === 'GET') {
        if (!latest) return json(404, { error: 'nothing stored yet' });
        return send(200, await readFile(file(latest)), { 'content-type': 'application/json', etag: `"${latest}"` });
      }
      if (pathname === '/v1/snapshot' && req.method === 'PUT') {
        const claimed = (req.headers['if-match'] || '').replaceAll('"', '');
        if (latest && claimed !== latest) return json(412, { error: 'newer data', latest }, { etag: `"${latest}"` });
        const body = await readBody(req);
        JSON.parse(body.toString('utf8'));
        const version = `${String(now()).padStart(13, '0')}-${sha256(body).slice(0, 8)}`;
        const temporary = join(db.dataDir, `${name}-${version}.tmp`);
        await writeFile(temporary, body, { mode: 0o600 });
        await rename(temporary, file(version));
        await prune(name);
        return json(200, { version }, { etag: `"${version}"` });
      }
      if (pathname === '/v1/snapshots' && req.method === 'GET') {
        const list = await Promise.all(
          all.map(async (version) => ({
            version,
            savedAt: new Date(Number(version.split('-')[0])).toISOString(),
            bytes: (await stat(file(version))).size,
          }))
        );
        return json(200, { snapshots: list.reverse() });
      }
      const old = pathname.match(/^\/v1\/snapshots\/([^/]+)$/);
      if (old && req.method === 'GET' && all.includes(old[1]))
        return send(200, await readFile(file(old[1])), { 'content-type': 'application/json' });
      return json(404, { error: 'not found' });
    } catch (err) {
      if (err instanceof SyntaxError) return json(400, { error: 'not json' });
      if (err.status === 413) return json(413, { error: 'too large' });
      console.error(err);
      return json(500, { error: 'server error' });
    }
  });
}

if (process.argv[1]?.endsWith('server.js')) {
  const dataDir = process.env.DATA_DIR || '/data';
  await mkdir(dataDir, { recursive: true });
  const origins = (process.env.ALLOWED_ORIGINS || 'https://fouad-boudouhi.de').split(',');
  createSyncServer({ dataDir, origins }).listen(Number(process.env.PORT) || 8787, () =>
    console.log('Volumora sync is listening')
  );
}
