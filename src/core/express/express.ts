import {
  CONST_ENCODING_UTF_8,
  CONST_MIME_APPLICATION_JSON,
  CONST_MIME_APPLICATION_X_WWW_FORM_URLENCODED,
} from '@http';

import type { Application, RequestHandler } from './interfaces';
import { RouterImpl } from './router';
import { hasMediaType } from './utils';

function makeApp() {
  const r = new RouterImpl();

  const app: Application = {
    all: (p, ...h) => {
      r.all(p, ...h);

      return app;
    },
    delete: (p, ...h) => {
      r.delete(p, ...h);

      return app;
    },
    get: (p, ...h) => {
      r.get(p, ...h);

      return app;
    },
    handle: (req) => r.handle(req),
    head: (p, ...h) => {
      r.head(p, ...h);

      return app;
    },
    options: (p, ...h) => {
      r.options(p, ...h);

      return app;
    },
    patch: (p, ...h) => {
      r.patch(p, ...h);

      return app;
    },
    post: (p, ...h) => {
      r.post(p, ...h);

      return app;
    },
    put: (p, ...h) => {
      r.put(p, ...h);

      return app;
    },
    use: ((pathOrFn: any, ...fns: any[]) => {
      if (typeof pathOrFn === 'string') {
        r.use(pathOrFn, ...fns);
      } else {
        r.use(pathOrFn);
      }

      return app;
    }) as any,
  };

  return app;
}

function express() {
  return makeApp();
}

function Router() {
  return new (RouterImpl as any)();
}

function json(): RequestHandler {
  return (req, _res, next) => {
    if (
      !req.rawBody ||
      !hasMediaType(
        (req.headers['content-type'] || req.headers['Content-Type']) as
          | string
          | undefined,
        CONST_MIME_APPLICATION_JSON
      )
    ) {
      return next();
    }

    req.bodyText = req.rawBody.toString(CONST_ENCODING_UTF_8);

    try {
      req.body = req.bodyText ? JSON.parse(req.bodyText) : undefined;
    } catch (e: any) {
      return next(e);
    }

    next();
  };
}

function urlencoded(): RequestHandler {
  return (req, _res, next) => {
    const contentType = (req.headers['content-type'] ||
      req.headers['Content-Type']) as string | undefined;

    if (
      !req.rawBody ||
      !hasMediaType(contentType, CONST_MIME_APPLICATION_X_WWW_FORM_URLENCODED)
    ) {
      return next();
    }

    const obj: Record<string, any> = {};
    const text = req.rawBody.toString(CONST_ENCODING_UTF_8);
    const kvs = text.split('&');

    for (const pair of kvs) {
      if (!pair) {
        continue;
      }

      const idx = pair.indexOf('=');

      let k, v;

      if (idx === -1) {
        k = pair;
        v = '';
      } else {
        k = pair.slice(0, idx);
        v = pair.slice(idx + 1);
      }

      const key = decodeURIComponent(k.replace(/\+/g, ' '));
      const val = decodeURIComponent(v.replace(/\+/g, ' '));

      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = val;

        continue;
      }

      const prev = obj[key];
      obj[key] = Array.isArray(prev) ? [...prev, val] : [prev, val];
    }

    req.bodyText = text;
    req.body = obj;

    next();
  };
}

export { express, json, Router, urlencoded };
