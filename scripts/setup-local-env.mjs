import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const secretPlaceholder = 'generate-on-local-setup';

function setupLocalEnv() {
  const template = readFileSync('.env.example', 'utf8');
  const existing = existsSync('.env');
  const original = existing ? readFileSync('.env', 'utf8') : template;
  const current = parseEnv(original);

  if ((process.env.NODE_ENV ?? current.NODE_ENV) === 'production') {
    return;
  }

  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  let updated = original;

  for (const [key, value] of Object.entries(parseEnv(template))) {
    if (Object.hasOwn(current, key)) {
      continue;
    }

    const separator = updated.length && !updated.endsWith('\n') ? newline : '';
    updated += separator + key + '=' + value + newline;
  }

  for (const key of ['AUTH_JWT_SECRET', 'LIVEKIT_API_SECRET']) {
    const secret = parseEnv(updated)[key];

    if (!secret || secret === secretPlaceholder) {
      const generated = randomBytes(32).toString('hex');
      updated = updated.replace(
        new RegExp('^([ \\t]*(?:export[ \\t]+)?' + key + '[ \\t]*=)[^#\\r\\n]*(#[^\\r\\n]*)?', 'gm'),
        (_, prefix, comment) => prefix + generated + (comment ? ' ' + comment : ''),
      );
    }
  }

  if (!existing || updated !== original) {
    // Exclusive creation prevents two startup processes from generating different keys.
    const pending = '.env.setup.tmp';
    const mode = existing ? statSync('.env').mode & 0o777 : 0o600;
    writeFileSync(pending, updated, { mode, flag: 'wx' });

    try {
      // Another process may have finished setup since the initial read.
      if ((existsSync('.env') ? readFileSync('.env', 'utf8') : null) === (existing ? original : null)) {
        renameSync(pending, '.env');
      } else {
        throw new Error('The .env file changed during setup. Run pnpm env:setup again.');
      }
    } catch (error) {
      rmSync(pending, { force: true });
      throw error;
    }
  }
}

setupLocalEnv();
