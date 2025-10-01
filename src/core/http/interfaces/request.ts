import type { T_METHOD } from './method';
import type { T_QUERY } from './query';

type T_REQUEST = {
  method: T_METHOD;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
  query: T_QUERY;
  body: Buffer;
};

type T_PARSED_HEAD_REQUEST = {
  method: T_METHOD;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
  query: T_QUERY;
};

export type { T_PARSED_HEAD_REQUEST, T_REQUEST };
