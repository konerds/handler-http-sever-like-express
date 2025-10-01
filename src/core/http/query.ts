import type { T_QUERY } from './interfaces';

function parseQueryString(qs = '') {
  const parsed: T_QUERY = {};

  if (!qs) {
    return parsed;
  }

  const kvs = qs.split('&');

  for (const kv of kvs) {
    if (!kv) {
      continue;
    }

    let [k, v = ''] = kv.split('=');
    k = decodeURIComponent(k || '');
    v = decodeURIComponent(v || '');

    if (k in parsed) {
      parsed[k] = Array.isArray(parsed[k])
        ? parsed[k].concat(v)
        : [parsed[k] as string, v];

      continue;
    }

    parsed[k] = v;
  }

  return parsed;
}

export { parseQueryString };
