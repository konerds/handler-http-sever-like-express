import { createServer, Server, Socket } from 'net';

import {
  CONST_ENCODING_UTF_8,
  CONST_MIME_TEXT_PLAIN,
  CONST_REASON_STATUS_HTTP,
  CONST_STATUS_HTTP,
} from './constants';
import type { I_HANDLER, T_REQUEST } from './interfaces';
import { ErrorParseRequest, parseHead } from './request';
import { buildResponse } from './response';
import { getWrappedWithCharset } from './utils';

class ServerHTTP<T extends I_HANDLER> {
  private server?: Server;
  private sockets = new Set<Socket>();
  private hostname: string;
  private port: number;
  private handler: T;
  private logger: any;
  private limitBodyRequest: number;

  constructor(
    hostname: string,
    port: number,
    limitBodyRequest = 2 * 1024 * 1024,
    handler: T,
    logger: any = console
  ) {
    this.hostname = hostname;
    this.port = port;
    this.limitBodyRequest = limitBodyRequest;
    this.handler = handler;
    this.logger = logger;
  }

  start() {
    this.server = createServer((socket) => {
      this.logger.info({
        event: 'server_started',
        host: this.hostname,
        port: this.port,
      });

      this.sockets.add(socket);

      socket.on('close', () => this.sockets.delete(socket));

      socket.on('error', (err: any) => {
        if (err?.code === 'ECONNRESET') {
          return;
        }

        this.logger.warn({ event: 'socket_error', message: err?.message });
      });

      let buffer = Buffer.alloc(0);

      socket.on('data', async (chunk) => {
        try {
          buffer = Buffer.concat([buffer, chunk]);
          const delimiter = Buffer.from('\r\n\r\n');
          const idxEndHead = buffer.indexOf(delimiter);

          if (idxEndHead === -1) {
            return;
          }

          const { headers, httpVersion, method, path, query } = parseHead(
            buffer.slice(0, idxEndHead).toString(CONST_ENCODING_UTF_8)
          );
          const contentLength = Number(headers['content-length'] || 0);

          if (
            Number.isFinite(contentLength) &&
            contentLength > this.limitBodyRequest
          ) {
            const body =
              CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.PAYLOAD_TOO_LARGE];
            socket.write(
              buildResponse(
                CONST_STATUS_HTTP.PAYLOAD_TOO_LARGE,
                {
                  Connection: 'close',
                  'Content-Length': String(Buffer.byteLength(body)),
                  'Content-Type': getWrappedWithCharset(CONST_MIME_TEXT_PLAIN),
                },
                body
              )
            );
            socket.end();

            return;
          }

          const szDelimiter = delimiter.length;
          const szNeeded =
            idxEndHead + szDelimiter + Number(headers['content-length'] || 0);

          if (buffer.length < szNeeded) {
            return;
          }

          const req: T_REQUEST = {
            body: buffer.slice(idxEndHead + szDelimiter, szNeeded),
            headers,
            httpVersion,
            method,
            path,
            query,
          };

          buffer = buffer.slice(szNeeded);
          this.logger.info({
            event: 'request',
            method: req.method,
            path: req.path,
          });
          socket.write(await this.handler.handleSuccess(req));
          socket.end();
        } catch (e: any) {
          if (e instanceof ErrorParseRequest) {
            this.logger.warn({ event: 'parse_error', message: e.message });
            socket.write(await this.handler.handleError(e));
            socket.end();

            return;
          }

          this.logger.error({ event: 'server_error', message: e?.message });
          socket.write(
            buildResponse(
              CONST_STATUS_HTTP.INTERNAL_SERVER_ERROR,
              {
                Connection: 'close',
                'Content-Length': String(
                  Buffer.byteLength(
                    CONST_REASON_STATUS_HTTP[
                      CONST_STATUS_HTTP.INTERNAL_SERVER_ERROR
                    ]
                  )
                ),
                'Content-Type': getWrappedWithCharset(CONST_MIME_TEXT_PLAIN),
              },
              CONST_REASON_STATUS_HTTP[CONST_STATUS_HTTP.INTERNAL_SERVER_ERROR]
            )
          );
          socket.end();
        }
      });
    });

    this.server.on('error', (err: any) => {
      this.logger.error({ event: 'server_error', message: err?.message });
    });

    this.server.listen(this.port, this.hostname, () => {
      this.logger.info({
        event: 'listening',
        hostname: this.hostname,
        port: this.port,
      });
    });
  }

  async stop(opts: { msGrace?: number; msKill?: number } = {}) {
    const msGrace = opts.msGrace ?? 300;
    const msKill = opts.msKill ?? 3000;

    if (!this.server) {
      return;
    }

    this.logger.info({ event: 'shutdown_start', sockets: this.sockets.size });
    await new Promise<void>((resolve) =>
      this.server?.close(() => resolve())
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, msGrace));

    for (const s of this.sockets) {
      try {
        s.destroy();
      } catch {}
    }

    await new Promise((r) => setTimeout(r, msKill));
  }
}

export { ServerHTTP };
