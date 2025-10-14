import {
  CONST_MIME_TEXT_PLAIN,
  CONST_REASON_STATUS_HTTP,
  CONST_STATUS_HTTP,
  T_REQUEST,
} from '@http';

import { CONST_METHOD_ROUTER } from './constants';
import type {
  DefinitionRoute,
  ErrorRequestHandler,
  Request as ExpressRequest,
  HandlerAny,
  Layer,
  NextFunction,
  RequestHandler,
} from './interfaces';
import { Response } from './response';
import { cleanPath, createMatcher } from './utils';

class RouterImpl {
  #layers: Layer[] = [];

  async #dispatch(
    req: ExpressRequest,
    res: Response,
    fallthrough: boolean = false
  ) {
    const path = cleanPath(req.path || '/');
    let idx = 0;
    let stateError: any = undefined;

    const next: NextFunction = async (err?: any) => {
      if (res._sent) {
        return;
      }

      if (typeof err !== 'undefined') {
        stateError = err;
      }

      while (idx < this.#layers.length) {
        if (res._sent) {
          return;
        }

        const layer = this.#layers[idx++];

        if (
          !(
            layer.method === CONST_METHOD_ROUTER.USE ||
            layer.method === CONST_METHOD_ROUTER.ALL ||
            layer.method === req.method.toUpperCase()
          )
        ) {
          continue;
        }

        const { hit, params } = createMatcher(layer.path)(path);

        if (!hit) {
          continue;
        }

        if (params) {
          req.params = params;
        }

        if ((stateError && !layer.isError) || (!stateError && layer.isError)) {
          continue;
        }

        try {
          if (layer.isError) {
            await (layer.handlers[0] as ErrorRequestHandler)(
              stateError,
              req,
              res,
              next
            );
          } else {
            const handlers = layer.handlers as RequestHandler[];

            for (const fn of handlers) {
              if (res._sent) {
                break;
              }

              await fn(req, res, next);

              if (res._sent) {
                break;
              }
            }

            if (res._sent) {
              return;
            }
          }

          if (!stateError && res._sent) {
            return;
          }
        } catch (e: any) {
          stateError = e;
        }
      }
    };

    await next();

    if (!res._sent) {
      if (!fallthrough) {
        return res
          .status(CONST_STATUS_HTTP.NOT_FOUND)
          .type(CONST_MIME_TEXT_PLAIN)
          .send(CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.NOT_FOUND]);
      }

      if (typeof stateError !== 'undefined') {
        throw stateError;
      }
    }
  }

  #push(
    method: DefinitionRoute['method'],
    path: string,
    ...handlers: HandlerAny[]
  ) {
    const pathCleaned = cleanPath(path);

    this.#layers.push({
      handlers,
      isError: handlers.some((h) => h.length === 4),
      method,
      path:
        method === CONST_METHOD_ROUTER.USE
          ? pathCleaned === '/'
            ? '/*'
            : `${pathCleaned}/*`
          : pathCleaned,
    });
  }

  all(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.ALL, path, ...fns);

    return this;
  }

  delete(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.DELETE, path, ...fns);

    return this;
  }

  get(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.GET, path, ...fns);

    return this;
  }

  async handle(reqRaw: T_REQUEST) {
    const res = new Response();

    await this.#dispatch(
      {
        ...reqRaw,
        body: undefined,
        bodyText: undefined,
        params: Object.create(null),
        rawBody: reqRaw.body,
      },
      res,
      false
    );

    return res.finalize();
  }

  head(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.HEAD, path, ...fns);

    return this;
  }

  options(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.OPTIONS, path, ...fns);

    return this;
  }

  patch(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.PATCH, path, ...fns);

    return this;
  }

  post(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.POST, path, ...fns);

    return this;
  }

  put(path: string, ...fns: RequestHandler[]) {
    this.#push(CONST_METHOD_ROUTER.PUT, path, ...fns);

    return this;
  }

  use(pathOrFn: any, ...handlers: any[]) {
    if (typeof pathOrFn === 'string') {
      const base = cleanPath(pathOrFn);

      for (const h of handlers) {
        if (h?.handle) {
          this.#push(CONST_METHOD_ROUTER.USE, base, (async (req, res, next) => {
            const incoming = cleanPath(req.path || '/');

            try {
              await h.#dispatch(
                {
                  ...req,
                  path: incoming.startsWith(base)
                    ? incoming.slice(base.length) || '/'
                    : incoming,
                } as ExpressRequest,
                res,
                true
              );
            } catch (e) {
              return next(e);
            }

            if (!res._sent) {
              return next();
            }
          }) as RequestHandler);

          continue;
        }

        this.#push(CONST_METHOD_ROUTER.USE, base, h);
      }
    } else {
      this.#push(CONST_METHOD_ROUTER.USE, '/', pathOrFn);
    }

    return this;
  }
}

export { RouterImpl };
