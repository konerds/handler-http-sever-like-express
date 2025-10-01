import {
  buildResponse,
  CONST_ENCODING_UTF_8,
  CONST_MIME_APPLICATION_JSON,
  CONST_STATUS_HTTP,
  getWrappedWithCharset,
} from '@http';
import type { I_HANDLER, T_REQUEST } from '@http';

import type { Application } from './interfaces';

class ExpressAdapter implements I_HANDLER {
  #app: Application;
  #logger: any;

  constructor(app: Application, logger: any = console) {
    this.#app = app;
    this.#logger = logger;
  }

  async handleError(e: Error): Promise<Buffer> {
    const payload = {
      error: (e as any)?.message || 'Internal Error',
      ok: false,
    };

    return buildResponse(
      CONST_STATUS_HTTP.INTERNAL_SERVER_ERROR,
      {
        'Content-Type': getWrappedWithCharset(
          CONST_MIME_APPLICATION_JSON,
          CONST_ENCODING_UTF_8
        ),
      },
      Buffer.from(JSON.stringify(payload), CONST_ENCODING_UTF_8)
    );
  }

  async handleSuccess(req: T_REQUEST): Promise<Buffer> {
    try {
      return await this.#app.handle(req);
    } catch (e: any) {
      this.#logger.error({
        error: e?.message || String(e),
        event: 'handle_error',
      });

      return this.handleError(e);
    }
  }
}

export { ExpressAdapter };
