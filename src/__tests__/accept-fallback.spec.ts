import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { express, ExpressAdapter } from '@express';
import {
  CONST_ENCODING_UTF_8,
  CONST_MIME_TEXT_HTML,
  getWrappedWithCharset,
} from '@http';

import {
  cleanDirTemp,
  createRequest,
  makeDirTemp,
  parseHTTPResponse,
} from './utils';

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

      const ext = extname(targetAbs).toLowerCase();

      if (ext === '.html') {
        res.type(CONST_MIME_TEXT_HTML);
      }

      const buf = await fs.readFile(targetAbs);
      res.end(buf);
    } catch {
      return next();
    }
  };
}

function makeSpaFallback(rootDir: string) {
  const rootAbs = resolve(rootDir);
  const indexAbs = resolve(rootAbs, 'index.html');

  return async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') {
      return next();
    }

    const accept = (req.headers['accept'] || req.headers['Accept']) as
      | string
      | undefined;

    if (!accept || !accept.includes('text/html')) {
      return next();
    }

    const p = (req.path || '/') as string;
    const last = p.split('/').pop() || '';

    if (last.includes('.') || p === '/api') {
      return next();
    }

    try {
      const buf = await fs.readFile(indexAbs);
      res.type(CONST_MIME_TEXT_HTML).end(buf);
    } catch {
      return next();
    }
  };
}

describe('Accept header & SPA fallback', () => {
  const dirTemp = makeDirTemp();
  let handler: ExpressAdapter;

  beforeAll(() => {
    writeFileSync(
      join(dirTemp, 'index.html'),
      '<!doctype html><title>Test</title>',
      CONST_ENCODING_UTF_8
    );

    const app = express();
    app.use(makeStatic(dirTemp));
    app.use(makeSpaFallback(dirTemp));
    handler = new ExpressAdapter(app, console);
  });

  afterAll(() => {
    cleanDirTemp(dirTemp);
  });

  it('serves index.html when GET / and Accept: text/html', async () => {
    const { body, headers, status } = parseHTTPResponse(
      await handler.handleSuccess(createRequest('/', CONST_MIME_TEXT_HTML))
    );
    expect(status).toBe(200);
    expect(headers['Content-Type']).toBe(
      getWrappedWithCharset(CONST_MIME_TEXT_HTML)
    );
    expect(body.includes('<!doctype html>')).toBe(true);
  });

  it('returns 404 (no SPA) on unknown route when Accept: application/json', async () => {
    expect(
      parseHTTPResponse(
        await handler.handleSuccess(
          createRequest('/unknown', 'application/json')
        )
      ).status
    ).toBe(404);
  });

  it('does not fallback for /api (exact) even if Accept: text/html', async () => {
    expect(
      parseHTTPResponse(
        await handler.handleSuccess(createRequest('/api', CONST_MIME_TEXT_HTML))
      ).status
    ).toBe(404);
  });
});
