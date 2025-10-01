import type { T_REQUEST } from './request';

interface I_HANDLER {
  handleSuccess(_: T_REQUEST): Promise<Buffer>;
  handleError(_: Error): Promise<Buffer>;
}

export type { I_HANDLER };
