import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import type { TestProject } from 'vitest/node';

export default function setup(project: TestProject) {
  const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');

  execFileSync(process.execPath, [cli, 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: project.config.env.DATABASE_URL },
    stdio: 'inherit',
  });
}
