import { readFile } from 'node:fs/promises';

import {
  buildResponse,
  CONST_ENCODING_UTF_8,
  CONST_MIME_APPLICATION_JSON,
  CONST_MIME_APPLICATION_OCTET_STREAM,
  CONST_MIME_IMAGE_SVG_XML,
  CONST_MIME_TEXT_PLAIN,
  CONST_STATUS_HTTP,
  getMIMEByPath,
  getWrappedWithCharset,
} from '@http';

import { normalizeNameHeader } from './utils';

class Response {
  #body: Buffer = Buffer.alloc(0);
  #headers: Record<string, string> = {};
  #sent = false;
  #statusCode: number = CONST_STATUS_HTTP.OK;

  #ensureDefaultTypeForBody(body: any) {
    if (this.get('Content-Type')) {
      return;
    }

    if (Buffer.isBuffer(body)) {
      this.set('Content-Type', CONST_MIME_APPLICATION_OCTET_STREAM);

      return;
    }

    if (typeof body === 'string') {
      this.set(
        'Content-Type',
        body.trimStart().startsWith('<svg')
          ? getWrappedWithCharset(
              CONST_MIME_IMAGE_SVG_XML,
              CONST_ENCODING_UTF_8
            )
          : getWrappedWithCharset(CONST_MIME_TEXT_PLAIN, CONST_ENCODING_UTF_8)
      );

      return;
    }
  }

  append(field: string, value: string) {
    if (this.#sent) {
      return this;
    }

    const key = normalizeNameHeader(field);

    this.#headers[key] = this.#headers[key]
      ? this.#headers[key] + ', ' + value
      : value;

    return this;
  }

  attachment(filename?: string) {
    return this.set(
      'Content-Disposition',
      filename ? `attachment; filename="${filename}"` : 'attachment'
    );
  }

  async download(pathAbs: string, filename?: string) {
    if (filename) {
      this.attachment(filename);
    }

    return this.sendFile(pathAbs);
  }

  end(chunk?: string | Buffer) {
    if (this.#sent) {
      return this;
    }

    if (chunk != null) {
      this.write(chunk);
    }

    this.#sent = true;

    return this;
  }

  finalize() {
    if (!this.get('Content-Length')) {
      this.set('Content-Length', String(this.#body.length));
    }

    return buildResponse(this.#statusCode, this.#headers, this.#body) as Buffer;
  }

  get(field: string) {
    return this.#headers[normalizeNameHeader(field)];
  }

  json(data: any) {
    if (this.#sent) {
      return this;
    }

    const buf = Buffer.from(JSON.stringify(data), CONST_ENCODING_UTF_8);

    this.set(
      'Content-Type',
      getWrappedWithCharset(CONST_MIME_APPLICATION_JSON, CONST_ENCODING_UTF_8)
    );
    this.set('Content-Length', String(buf.length));
    this.#body = buf;
    this.#sent = true;

    return this;
  }

  location(url: string) {
    return this.set('Location', url);
  }

  redirect(argFirst: number | string, argSecond?: string) {
    if (this.#sent) {
      return this;
    }

    const url =
      typeof argFirst === 'number'
        ? String(argSecond || '/')
        : String(argFirst);

    this.status(
      typeof argFirst === 'number' ? argFirst : CONST_STATUS_HTTP.FOUND
    )
      .location(url)
      .send();

    return this;
  }

  send(body?: string | Buffer | object) {
    if (this.#sent) {
      return this;
    }

    if (body == null) {
      body = '';
    }

    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      return this.json(body as any);
    }

    this.#ensureDefaultTypeForBody(body);
    this.#body = Buffer.isBuffer(body)
      ? body
      : Buffer.from(String(body), CONST_ENCODING_UTF_8);
    this.#sent = true;

    return this;
  }

  async sendFile(pathAbs: string) {
    if (this.#sent) {
      return this;
    }

    const buf = await readFile(pathAbs);

    this.type(getMIMEByPath(pathAbs));
    this.set('Content-Length', String(buf.length));
    this.#body = buf;
    this.#sent = true;

    return this;
  }

  set(field: string, value: string) {
    this.#headers[normalizeNameHeader(field)] = value;

    return this;
  }

  status(code: number) {
    if (this.#sent) {
      return this;
    }

    this.#statusCode = code;

    return this;
  }

  type(contentType: string) {
    if (this.#sent) {
      return this;
    }

    const contentTypeLowercased = (contentType || '').toLowerCase();

    this.set(
      'Content-Type',
      (contentTypeLowercased.startsWith('text/') ||
        contentTypeLowercased === CONST_MIME_APPLICATION_JSON) &&
        !/\bcharset\s*=/.test(contentTypeLowercased)
        ? getWrappedWithCharset(contentType, CONST_ENCODING_UTF_8)
        : contentType
    );

    return this;
  }

  write(chunk: string | Buffer) {
    if (this.#sent) {
      return false;
    }

    this.#body = Buffer.concat([
      this.#body,
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk), CONST_ENCODING_UTF_8),
    ]);

    return true;
  }

  public get _sent() {
    return this.#sent;
  }
}

export { Response };
