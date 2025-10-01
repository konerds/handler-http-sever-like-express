import { CONST_METHOD } from '../constants';

type T_METHOD = (typeof CONST_METHOD)[keyof typeof CONST_METHOD];

export type { T_METHOD };
