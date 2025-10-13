import * as fs from 'node:fs/promises';
import { resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { express, ExpressAdapter } from '@express';
import { CONST_ENCODING_UTF_8 } from '@http';

import { cleanDirTemp, createRequest, makeDirTemp } from './utils';

function makeStatic(rootDir: string) {
  const rootAbs = resolve(rootDir);

  return async (req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const urlPath = (req.path || '/') as string;
    const relPath = urlPath === '/' ? '/index.html' : urlPath;

    const targetAbs = resolve(rootAbs, '.' + relPath);

    if (!targetAbs.startsWith(rootAbs)) {
      res.status(403).type('text/plain').send('Forbidden');

      return;
    }

    try {
      const st = await fs.stat(targetAbs);

      if (!st.isFile()) {
        return next();
      }

      const buf = await fs.readFile(targetAbs);
      res.end(buf);
    } catch {
      return next();
    }
  };
}

describe('Path traversal prevention', () => {
  const dirTemp = makeDirTemp();
  const app = express();
  app.use(makeStatic(dirTemp));
  const handler = new ExpressAdapter(app, console);

  afterAll(() => {
    cleanDirTemp(dirTemp);
  });

  it('blocks traversal attempts with 403', async () => {
    const headLine = (
      await handler.handleSuccess(
        createRequest('/../../directory/traversal/attack')
      )
    )
      .toString(CONST_ENCODING_UTF_8)
      .split('\r\n\r\n')[0]
      .split('\r\n')[0];

    const status = Number(/^HTTP\/1\.1\s+(\d+)/.exec(headLine)![1]);
    expect(status).toBe(403);
  });
});
