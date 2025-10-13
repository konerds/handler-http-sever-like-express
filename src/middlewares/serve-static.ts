import { stat } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import {
  CONST_METHOD,
  CONST_MIME_TEXT_PLAIN,
  CONST_REASON_STATUS_HTTP,
  CONST_STATUS_HTTP,
  getMIMEByPath,
  getWrappedWithCharset,
} from '@http';

import { asyncHandler } from './async-handler';

const serveStatic = (pathRootStatic: string) =>
  asyncHandler(async (req, res, next) => {
    if (req.method !== CONST_METHOD.GET && req.method !== CONST_METHOD.HEAD) {
      return next();
    }

    const raw = (req.path ?? '/').split('?')[0];

    let decoded: string;

    try {
      decoded = decodeURIComponent(raw);
    } catch {
      res
        .status(CONST_STATUS_HTTP.BAD_REQUEST)
        .type(getWrappedWithCharset(CONST_MIME_TEXT_PLAIN))
        .send(CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.BAD_REQUEST]);

      return;
    }

    if (decoded.startsWith('/api')) {
      return next();
    }

    if (decoded.includes('\0')) {
      res
        .status(CONST_STATUS_HTTP.BAD_REQUEST)
        .type(getWrappedWithCharset(CONST_MIME_TEXT_PLAIN))
        .send(CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.BAD_REQUEST]);

      return;
    }

    decoded = decoded.replace(/\\/g, '/');

    let pathAbsSanitized = posix.normalize(decoded.replace(/^\/+/, ''));

    if (
      pathAbsSanitized === '..' ||
      pathAbsSanitized.startsWith('../') ||
      pathAbsSanitized.includes('/../')
    ) {
      res
        .status(CONST_STATUS_HTTP.FORBIDDEN)
        .type(getWrappedWithCharset(CONST_MIME_TEXT_PLAIN))
        .send(CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.FORBIDDEN]);

      return;
    }

    if (pathAbsSanitized === '' || pathAbsSanitized === '.') {
      pathAbsSanitized = 'index.html';
    }

    if (pathAbsSanitized === '/') {
      pathAbsSanitized += 'index.html';
    }

    pathAbsSanitized = resolve(pathRootStatic, pathAbsSanitized);

    try {
      if (req.method === CONST_METHOD.HEAD) {
        res
          .type(getMIMEByPath(pathAbsSanitized))
          .set('Content-Length', String((await stat(pathAbsSanitized)).size))
          .send('');

        return;
      }

      try {
        await res.sendFile(pathAbsSanitized);
      } catch {
        await res.sendFile(resolve(pathRootStatic, 'index.html'));
      }
    } catch {
      return next();
    }
  });

export { serveStatic };
