import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { CONST_METHOD, type T_REQUEST } from '@http';

function createRequest(path: string, accept?: string): T_REQUEST {
  return {
    body: Buffer.alloc(0),
    headers: accept ? { accept } : {},
    httpVersion: 'HTTP/1.1',
    method: CONST_METHOD.GET,
    path,
    query: {},
  };
}

function parseHTTPResponse(buffer: Buffer) {
  const [head, ...body] = buffer.toString('utf-8').split('\r\n\r\n');
  const [metadata, ...lines] = head.split('\r\n');
  const [, status, reason] = /^HTTP\/1\.1\s+(\d+)\s+(.*)$/.exec(metadata)!;
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const idx = line.indexOf(':');

    if (idx < 1) {
      continue;
    }

    headers[line.slice(0, idx)] = line.slice(idx + 1).trim();
  }

  return {
    body: body.join('\r\n\r\n'),
    headers,
    reason,
    status: Number(status),
  };
}

function makeDirTemp() {
  return mkdtempSync(join(os.tmpdir(), 'mini-ts-http-server-'));
}

function cleanDirTemp(dirTemp: string) {
  rmSync(dirTemp, { force: true, recursive: true });
}

export { cleanDirTemp, createRequest, makeDirTemp, parseHTTPResponse };
