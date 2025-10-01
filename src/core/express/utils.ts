function decodeSafe(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function toMessage(e: any) {
  return (e && (e.message ?? e.toString?.())) || String(e);
}

function cleanPath(p: string) {
  if (!p) {
    return '/';
  }

  if (!p.startsWith('/')) {
    p = '/' + p;
  }

  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }

  return p;
}

function createMatcher(pattern: string) {
  const pat = cleanPath(pattern);
  const parts = pat.split('/');
  const isWildcard = parts[parts.length - 1] === '*';

  return (inputPath: string) => {
    const segs = cleanPath(inputPath).split('/');

    const cmpParts = isWildcard ? parts.slice(0, -1) : parts;

    if (!isWildcard && cmpParts.length !== segs.length) {
      return { hit: false as const };
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < cmpParts.length; ++i) {
      const pp = cmpParts[i];
      const ss = segs[i];

      if (pp === '*') {
        break;
      }

      if (pp.startsWith(':')) {
        params[pp.slice(1)] = decodeSafe(ss);
      } else if (pp !== ss) {
        return { hit: false as const };
      }
    }

    return { hit: true as const, params };
  };
}

function normalizeNameHeader(name: string) {
  const lower = name.toLowerCase();

  if (lower === 'content-type') {
    return 'Content-Type';
  }

  if (lower === 'content-length') {
    return 'Content-Length';
  }

  if (lower === 'connection') {
    return 'Connection';
  }

  if (lower === 'location') {
    return 'Location';
  }

  return name;
}

function parseMediaType(value: string | undefined) {
  if (!value) {
    return { params: {} as Record<string, string>, type: '' };
  }

  const [type, ...rest] = value.split(';');
  const params: Record<string, string> = {};

  for (const p of rest) {
    const [k, v] = p.split('=');

    if (!k || v == null) {
      continue;
    }

    params[k.trim().toLowerCase()] = v.trim().replace(/^"|"$/g, '');
  }

  return { params, type: (type || '').trim().toLowerCase() };
}

function hasMediaType(headerValue: string | undefined, expected: string) {
  const { type } = parseMediaType(headerValue);

  return type === expected.toLowerCase();
}

export {
  cleanPath,
  createMatcher,
  decodeSafe,
  hasMediaType,
  normalizeNameHeader,
  parseMediaType,
  toMessage,
};
