import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { express, ExpressAdapter } from '@express';
import {
  CONST_MIME_IMAGE_JPEG,
  CONST_MIME_TEXT_CSS,
  CONST_MIME_TEXT_HTML,
  CONST_MIME_TEXT_JAVASCRIPT,
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

      if (ext === '.css') {
        res.type(CONST_MIME_TEXT_CSS);
      } else if (ext === '.js') {
        res.type(CONST_MIME_TEXT_JAVASCRIPT);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.type(CONST_MIME_IMAGE_JPEG);
      } else if (ext === '.html') {
        res.type(CONST_MIME_TEXT_HTML);
      }

      const buf = await fs.readFile(targetAbs);
      res.end(buf);
    } catch {
      return next();
    }
  };
}

describe('Static serving & MIME & 404', () => {
  const dirTemp = makeDirTemp();
  let handler: ExpressAdapter;

  beforeAll(() => {
    writeFileSync(join(dirTemp, 'style.css'), 'body{color:#222}', 'utf-8');
    writeFileSync(join(dirTemp, 'app.js'), 'console.log(1)', 'utf-8');
    writeFileSync(join(dirTemp, 'photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));

    const app = express();
    app.use(makeStatic(dirTemp));
    handler = new ExpressAdapter(app, console);
  });

  afterAll(() => {
    cleanDirTemp(dirTemp);
  });

  it('serves CSS with text/css', async () => {
    const { headers, status } = parseHTTPResponse(
      await handler.handleSuccess(
        createRequest('/style.css', CONST_MIME_TEXT_HTML)
      )
    );
    expect(status).toBe(200);
    expect(headers['Content-Type']).toBe(
      getWrappedWithCharset(CONST_MIME_TEXT_CSS)
    );
  });

  it('serves JS with text/javascript', async () => {
    const { headers, status } = parseHTTPResponse(
      await handler.handleSuccess(
        createRequest('/app.js', CONST_MIME_TEXT_HTML)
      )
    );
    expect(status).toBe(200);
    expect(headers['Content-Type']).toBe(
      getWrappedWithCharset(CONST_MIME_TEXT_JAVASCRIPT)
    );
  });

  it('serves JPG with image/jpeg', async () => {
    const { headers, status } = parseHTTPResponse(
      await handler.handleSuccess(
        createRequest('/photo.jpg', CONST_MIME_TEXT_HTML)
      )
    );
    expect(status).toBe(200);
    expect(headers['Content-Type']).toBe(CONST_MIME_IMAGE_JPEG);
  });

  it('unknown static path with extension returns 404 (no fallback)', async () => {
    expect(
      parseHTTPResponse(
        await handler.handleSuccess(
          createRequest('/nope.css', CONST_MIME_TEXT_HTML)
        )
      ).status
    ).toBe(404);
  });
});
