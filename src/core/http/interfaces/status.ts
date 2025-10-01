import { CONST_STATUS_HTTP } from '../constants';

type T_STATUS_HTTP = (typeof CONST_STATUS_HTTP)[keyof typeof CONST_STATUS_HTTP];

export type { T_STATUS_HTTP };
