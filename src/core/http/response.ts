import { CONST_ENCODING_UTF_8, CONST_REASON_STATUS_HTTP } from './constants';

function buildResponse(
  status: number,
  headers: Record<string, string> = {},
  body: Buffer | string = ''
) {
  return Buffer.concat([
    Buffer.from(
      `HTTP/1.1 ${status} ${CONST_REASON_STATUS_HTTP[status] || 'OK'}\r\n` +
        Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n',
      CONST_ENCODING_UTF_8
    ),
    Buffer.isBuffer(body) ? body : Buffer.from(body),
  ]);
}

export { buildResponse };
