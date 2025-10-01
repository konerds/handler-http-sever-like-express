import type { T_REQUEST } from '@http';

import { CONST_METHOD_ROUTER } from './constants';
import type { Response } from './response';

type NextFunction = (_err?: any) => void | Promise<void>;

interface Request extends Omit<T_REQUEST, 'body'> {
  params: Record<string, string>;
  rawBody: Buffer;
  body?: any;
  bodyText?: string;
}

type RequestHandler = (
  _req: Request,
  _res: Response,
  _next: NextFunction
) => any;

type ErrorRequestHandler = (
  _err: any,
  _req: Request,
  _res: Response,
  _next: NextFunction
) => any;

type HandlerAny = RequestHandler | ErrorRequestHandler;

type T_METHOD_ROUTER =
  (typeof CONST_METHOD_ROUTER)[keyof typeof CONST_METHOD_ROUTER];

interface DefinitionRoute {
  method: T_METHOD_ROUTER;
  path: string;
  handlers: HandlerAny[];
}

type Layer = {
  method: DefinitionRoute['method'];
  path: string;
  handlers: HandlerAny[];
  isError: boolean;
};

interface Application {
  use: {
    (_path: string, ..._fns: HandlerAny[]): Application;
    (..._fns: HandlerAny[]): Application;
  };
  get: (_path: string, ..._fns: RequestHandler[]) => Application;
  post: (_path: string, ..._fns: RequestHandler[]) => Application;
  put: (_path: string, ..._fns: RequestHandler[]) => Application;
  patch: (_path: string, ..._fns: RequestHandler[]) => Application;
  delete: (_path: string, ..._fns: RequestHandler[]) => Application;
  head: (_path: string, ..._fns: RequestHandler[]) => Application;
  options: (_path: string, ..._fns: RequestHandler[]) => Application;
  all: (_path: string, ..._fns: RequestHandler[]) => Application;

  handle: (_req: T_REQUEST) => Promise<Buffer>;
}

export type {
  Application,
  DefinitionRoute,
  ErrorRequestHandler,
  HandlerAny,
  Layer,
  NextFunction,
  Request,
  RequestHandler,
  Response,
};
