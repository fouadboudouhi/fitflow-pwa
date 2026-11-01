// For whoever runs the server: invitations, the list of accounts, a new password for someone who forgot theirs.
// Run inside the container: docker compose exec volumora-sync node admin.js <command>
import { randomBytes } from 'node:crypto';
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { store } from './server.js';

const db = store(process.env.DATA_DIR || '/data');
const [command, argument] = process.argv.slice(2);

const sizeOf = async (name) => {
  const dir = db.snapshotsDir(name);
  const files = await readdir(dir).catch(() => []);
  const sizes = await Promise.all(files.map((f) => stat(join(dir, f)).then((s) => s.size)));
  return { versions: files.length, megabytes: Math.round(sizes.reduce((a, b) => a + b, 0) / 1e5) / 10 };
};

switch (command) {
  case 'invite': {
    const count = Math.max(1, Math.min(20, Number(argument) || 1));
    for (let i = 0; i < count; i++) console.log(await db.createInvite());
    break;
  }
  case 'invites': {
    const list = await db.invites();
    if (!list.length) console.log('No invitations yet.');
    list.forEach((i) => console.log(`${i.code}  ${i.usedBy ? `used by ${i.usedBy}` : 'open'}  ${i.createdAt}`));
    break;
  }
  case 'users': {
    const users = await db.users();
    if (!users.length) console.log('No accounts yet.');
    for (const name of users) {
      const data = await db.account(name);
      const size = await sizeOf(name);
      console.log(`${name}  since ${data?.createdAt?.slice(0, 10)}  ${size.versions} versions, ${size.megabytes} MB`);
    }
    break;
  }
  case 'reset-password': {
    const password = randomBytes(9).toString('base64url');
    if (!(await db.setPassword(argument, password))) {
      console.error(`No account named ${argument}.`);
      process.exit(1);
    }
    console.log(`New password for ${argument}: ${password}`);
    console.log('They sign in with it in the app and can keep it or choose their own there.');
    break;
  }
  case 'delete-user': {
    if (!(await db.account(argument))) {
      console.error(`No account named ${argument}.`);
      process.exit(1);
    }
    await rm(join(db.usersDir, argument), { recursive: true, force: true });
    console.log(`Deleted ${argument} with all versions.`);
    break;
  }
  default:
    console.log('Commands: invite [count] · invites · users · reset-password <name> · delete-user <name>');
}
