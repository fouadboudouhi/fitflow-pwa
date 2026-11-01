// Stores the snapshots of one Volumora installation. One person, no database, no dependencies. The connection is HTTPS;
// the first upload sets the access code and after that everything needs it. Older versions stay, so a mistake can be undone.
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';

const KEEP_LATEST = 20;
const KEEP_DAILY_DAYS = 60;
const MIN_CODE = 20;
const MAX_FAILURES = 10;
const FAILURE_WINDOW = 10 * 60 * 1000;
const DAY = 86400000;

const hash = (code) => createHash('sha256').update(code).digest();
const VERSION = /^\d{13}-[0-9a-f]{8}$/;

export function createSyncServer({ dataDir, origins, maxBytes = 64 * 1024 * 1024, now = Date.now }) {
  const snapshots = join(dataDir, 'snapshots');
  const authFile = join(dataDir, 'auth.sha256');
  const failures = new Map();

  const versions = async () =>
    (await readdir(snapshots).catch(() => []))
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -5))
      .filter((name) => VERSION.test(name))
      .sort();

  const storedCode = () => readFile(authFile).catch(() => null);

  // Newest ones, plus the last one of each recent day.
  async function prune() {
    const all = await versions();
    const keep = new Set(all.slice(-KEEP_LATEST));
    const days = new Map();
    all.forEach((version) => {
      const at = Number(version.split('-')[0]);
      if (now() - at <= KEEP_DAILY_DAYS * DAY) days.set(new Date(at).toISOString().slice(0, 10), version);
    });
    days.forEach((version) => keep.add(version));
    await Promise.all(
      all.filter((v) => !keep.has(v)).map((v) => rm(join(snapshots, `${v}.json`), { force: true }))
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

  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = origins.includes(origin)
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-headers': 'authorization, content-type, if-match',
          'access-control-allow-methods': 'GET, PUT, OPTIONS',
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

      const code = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const expected = await storedCode();
      const matches = expected && timingSafeEqual(hash(code), expected);
      const registering = !expected && req.method === 'PUT' && pathname === '/v1/snapshot';
      if (!matches && !registering && expected) {
        failures.set(ip, { count: (failures.get(ip)?.count || 0) + 1, at: now() });
        return json(401, { error: 'wrong code' });
      }
      if (!expected && !registering) return json(404, { error: 'nothing stored yet' });
      if (registering && code.length < MIN_CODE) return json(400, { error: 'code too short' });
      failures.delete(ip);
      await mkdir(snapshots, { recursive: true });

      const all = await versions();
      const latest = all.at(-1);
      if (pathname === '/v1/snapshot' && req.method === 'GET') {
        if (!latest) return json(404, { error: 'nothing stored yet' });
        return send(200, await readFile(join(snapshots, `${latest}.json`)), {
          'content-type': 'application/json',
          etag: `"${latest}"`,
        });
      }
      if (pathname === '/v1/snapshot' && req.method === 'PUT') {
        const claimed = (req.headers['if-match'] || '').replaceAll('"', '');
        if (latest && claimed !== latest) return json(412, { error: 'newer data', latest }, { etag: `"${latest}"` });
        const body = await readBody(req);
        JSON.parse(body.toString('utf8'));
        const version = `${String(now()).padStart(13, '0')}-${hash(body).toString('hex').slice(0, 8)}`;
        const temporary = join(dataDir, `${version}.tmp`);
        await writeFile(temporary, body, { mode: 0o600 });
        await rename(temporary, join(snapshots, `${version}.json`));
        if (registering) await writeFile(authFile, hash(code), { mode: 0o600 });
        await prune();
        return json(200, { version }, { etag: `"${version}"` });
      }
      if (pathname === '/v1/snapshots' && req.method === 'GET') {
        const list = await Promise.all(
          all.map(async (version) => ({
            version,
            savedAt: new Date(Number(version.split('-')[0])).toISOString(),
            bytes: (await stat(join(snapshots, `${version}.json`))).size,
          }))
        );
        return json(200, { snapshots: list.reverse() });
      }
      const old = pathname.match(/^\/v1\/snapshots\/([^/]+)$/);
      if (old && req.method === 'GET' && all.includes(old[1]))
        return send(200, await readFile(join(snapshots, `${old[1]}.json`)), { 'content-type': 'application/json' });
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
